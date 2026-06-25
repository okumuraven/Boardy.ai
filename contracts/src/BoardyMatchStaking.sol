// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BoardyMatchStaking
 * @notice Holds bilateral AVAX commitment stakes for AI-matched introductions.
 *         Both parties must stake before a match is unlocked on-chain.
 * @dev Deploy on Avalanche Fuji (chainId 43113). Default stake: 0.01 AVAX.
 */
contract BoardyMatchStaking is Ownable, ReentrancyGuard {
    uint256 public immutable stakeAmount;

    enum MatchStatus {
        Pending,
        StakedA,
        StakedB,
        Unlocked,
        Refunded,
        Slashed
    }

    struct Match {
        address userA;
        address userB;
        MatchStatus status;
        bool withdrawnA;
        bool withdrawnB;
    }

    mapping(bytes32 matchId => Match) public matches;

    event MatchCreated(bytes32 indexed matchId, address indexed userA, address indexed userB);
    event Staked(bytes32 indexed matchId, address indexed staker, MatchStatus newStatus);
    event MatchUnlocked(bytes32 indexed matchId, address indexed userA, address indexed userB);
    event StakeWithdrawn(bytes32 indexed matchId, address indexed user, uint256 amount);
    event MatchSlashed(bytes32 indexed matchId, address indexed offender, uint256 amount);
    event MatchRefunded(bytes32 indexed matchId);

    error MatchAlreadyExists(bytes32 matchId);
    error MatchNotFound(bytes32 matchId);
    error InvalidParticipant(address caller);
    error IncorrectStakeAmount(uint256 sent, uint256 required);
    error InvalidMatchStatus(MatchStatus current, MatchStatus required);
    error AlreadyStaked(bytes32 matchId, address staker);
    error AlreadyWithdrawn(bytes32 matchId, address user);
    error InvalidAddresses();

    constructor(uint256 _stakeAmount) Ownable(msg.sender) {
        stakeAmount = _stakeAmount;
    }

    /**
     * @notice Register a bilateral match. Called by the Boardy backend after pgvector matching.
     * @param matchId Deterministic ID (e.g. keccak256 of backend match primary key).
     */
    function createMatch(bytes32 matchId, address userA, address userB) external onlyOwner {
        if (userA == address(0) || userB == address(0) || userA == userB) {
            revert InvalidAddresses();
        }
        if (matches[matchId].userA != address(0)) {
            revert MatchAlreadyExists(matchId);
        }

        matches[matchId] = Match({
            userA: userA,
            userB: userB,
            status: MatchStatus.Pending,
            withdrawnA: false,
            withdrawnB: false
        });

        emit MatchCreated(matchId, userA, userB);
    }

    /**
     * @notice Stake AVAX to commit to a match. Exact `stakeAmount` required.
     */
    function stake(bytes32 matchId) external payable nonReentrant {
        Match storage matchData = matches[matchId];
        if (matchData.userA == address(0)) revert MatchNotFound(matchId);
        if (msg.value != stakeAmount) revert IncorrectStakeAmount(msg.value, stakeAmount);

        address staker = msg.sender;
        if (staker != matchData.userA && staker != matchData.userB) {
            revert InvalidParticipant(staker);
        }

        if (staker == matchData.userA) {
            if (matchData.status != MatchStatus.Pending && matchData.status != MatchStatus.StakedB) {
                revert InvalidMatchStatus(matchData.status, MatchStatus.Pending);
            }
            if (matchData.status == MatchStatus.StakedB) {
                matchData.status = MatchStatus.Unlocked;
                emit MatchUnlocked(matchId, matchData.userA, matchData.userB);
            } else {
                matchData.status = MatchStatus.StakedA;
            }
        } else {
            if (matchData.status != MatchStatus.Pending && matchData.status != MatchStatus.StakedA) {
                revert InvalidMatchStatus(matchData.status, MatchStatus.Pending);
            }
            if (matchData.status == MatchStatus.StakedA) {
                matchData.status = MatchStatus.Unlocked;
                emit MatchUnlocked(matchId, matchData.userA, matchData.userB);
            } else {
                matchData.status = MatchStatus.StakedB;
            }
        }

        emit Staked(matchId, staker, matchData.status);
    }

    /**
     * @notice Withdraw commitment stake after the match is unlocked.
     */
    function withdrawStake(bytes32 matchId) external nonReentrant {
        Match storage matchData = matches[matchId];
        if (matchData.userA == address(0)) revert MatchNotFound(matchId);
        if (matchData.status != MatchStatus.Unlocked) {
            revert InvalidMatchStatus(matchData.status, MatchStatus.Unlocked);
        }

        address staker = msg.sender;
        if (staker == matchData.userA) {
            if (matchData.withdrawnA) revert AlreadyWithdrawn(matchId, staker);
            matchData.withdrawnA = true;
        } else if (staker == matchData.userB) {
            if (matchData.withdrawnB) revert AlreadyWithdrawn(matchId, staker);
            matchData.withdrawnB = true;
        } else {
            revert InvalidParticipant(staker);
        }

        (bool success,) = staker.call{value: stakeAmount}("");
        require(success, "Transfer failed");

        emit StakeWithdrawn(matchId, staker, stakeAmount);
    }

    /**
     * @notice Refund a single staker when the counterparty never commits.
     */
    function refundUnmatched(bytes32 matchId) external nonReentrant {
        Match storage matchData = matches[matchId];
        if (matchData.userA == address(0)) revert MatchNotFound(matchId);

        MatchStatus status = matchData.status;
        if (status != MatchStatus.StakedA && status != MatchStatus.StakedB) {
            revert InvalidMatchStatus(status, MatchStatus.StakedA);
        }

        address recipient;
        if (status == MatchStatus.StakedA) {
            if (msg.sender != matchData.userA) revert InvalidParticipant(msg.sender);
            recipient = matchData.userA;
        } else {
            if (msg.sender != matchData.userB) revert InvalidParticipant(msg.sender);
            recipient = matchData.userB;
        }

        matchData.status = MatchStatus.Refunded;
        (bool success,) = recipient.call{value: stakeAmount}("");
        require(success, "Transfer failed");

        emit MatchRefunded(matchId);
    }

    /**
     * @notice Slash a party's stake for verified ghosting or abuse.
     */
    function slash(bytes32 matchId, address offender) external onlyOwner nonReentrant {
        Match storage matchData = matches[matchId];
        if (matchData.userA == address(0)) revert MatchNotFound(matchId);

        MatchStatus status = matchData.status;
        bool canSlash = status == MatchStatus.StakedA || status == MatchStatus.StakedB || status == MatchStatus.Unlocked;
        if (!canSlash) revert InvalidMatchStatus(status, MatchStatus.StakedA);

        if (offender != matchData.userA && offender != matchData.userB) {
            revert InvalidParticipant(offender);
        }

        uint256 payout = stakeAmount;
        if (status == MatchStatus.Unlocked) {
            if (offender == matchData.userA) {
                if (matchData.withdrawnA) revert AlreadyWithdrawn(matchId, offender);
                matchData.withdrawnA = true;
            } else {
                if (matchData.withdrawnB) revert AlreadyWithdrawn(matchId, offender);
                matchData.withdrawnB = true;
            }
        } else {
            payout = stakeAmount;
        }

        matchData.status = MatchStatus.Slashed;

        (bool success,) = owner().call{value: payout}("");
        require(success, "Transfer failed");

        emit MatchSlashed(matchId, offender, payout);
    }

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
}
