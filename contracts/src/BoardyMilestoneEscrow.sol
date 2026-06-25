// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BoardyMilestoneEscrow
 * @notice AVAX escrow for deliverables between matched Boardy.ai users.
 * @dev Payer funds milestone; payee completes work; payer releases funds.
 */
contract BoardyMilestoneEscrow is Ownable, ReentrancyGuard {
    enum MilestoneStatus {
        Proposed,
        Funded,
        Completed,
        Released,
        Refunded,
        Disputed
    }

    struct Milestone {
        address payer;
        address payee;
        uint256 amount;
        string description;
        MilestoneStatus status;
    }

    mapping(bytes32 milestoneId => Milestone) public milestones;

    event MilestoneCreated(
        bytes32 indexed milestoneId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string description
    );
    event MilestoneFunded(bytes32 indexed milestoneId, address indexed payer, uint256 amount);
    event MilestoneCompleted(bytes32 indexed milestoneId, address indexed payee);
    event MilestoneReleased(bytes32 indexed milestoneId, address indexed payee, uint256 amount);
    event MilestoneRefunded(bytes32 indexed milestoneId, address indexed payer, uint256 amount);
    event MilestoneDisputed(bytes32 indexed milestoneId);
    event DisputeResolved(bytes32 indexed milestoneId, address indexed recipient, uint256 amount);

    error MilestoneAlreadyExists(bytes32 milestoneId);
    error MilestoneNotFound(bytes32 milestoneId);
    error InvalidParticipant(address caller);
    error InvalidAmount();
    error InvalidAddresses();
    error InvalidStatus(MilestoneStatus current, MilestoneStatus required);
    error TransferFailed();

    constructor() Ownable(msg.sender) {}

    function createMilestone(
        bytes32 milestoneId,
        address payer,
        address payee,
        uint256 amount,
        string calldata description
    ) external onlyOwner {
        if (payer == address(0) || payee == address(0) || payer == payee) {
            revert InvalidAddresses();
        }
        if (amount == 0) revert InvalidAmount();
        if (milestones[milestoneId].payer != address(0)) {
            revert MilestoneAlreadyExists(milestoneId);
        }

        milestones[milestoneId] = Milestone({
            payer: payer,
            payee: payee,
            amount: amount,
            description: description,
            status: MilestoneStatus.Proposed
        });

        emit MilestoneCreated(milestoneId, payer, payee, amount, description);
    }

    function fundMilestone(bytes32 milestoneId) external payable nonReentrant {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);
        if (msg.sender != milestone.payer) revert InvalidParticipant(msg.sender);
        if (milestone.status != MilestoneStatus.Proposed) {
            revert InvalidStatus(milestone.status, MilestoneStatus.Proposed);
        }
        if (msg.value != milestone.amount) revert InvalidAmount();

        milestone.status = MilestoneStatus.Funded;
        emit MilestoneFunded(milestoneId, msg.sender, msg.value);
    }

    function markCompleted(bytes32 milestoneId) external {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);
        if (msg.sender != milestone.payee) revert InvalidParticipant(msg.sender);
        if (milestone.status != MilestoneStatus.Funded) {
            revert InvalidStatus(milestone.status, MilestoneStatus.Funded);
        }

        milestone.status = MilestoneStatus.Completed;
        emit MilestoneCompleted(milestoneId, msg.sender);
    }

    function release(bytes32 milestoneId) external nonReentrant {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);
        if (msg.sender != milestone.payer) revert InvalidParticipant(msg.sender);
        if (milestone.status != MilestoneStatus.Completed) {
            revert InvalidStatus(milestone.status, MilestoneStatus.Completed);
        }

        milestone.status = MilestoneStatus.Released;
        uint256 amount = milestone.amount;

        (bool success,) = milestone.payee.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit MilestoneReleased(milestoneId, milestone.payee, amount);
    }

    function refund(bytes32 milestoneId) external nonReentrant {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);
        if (msg.sender != milestone.payer) revert InvalidParticipant(msg.sender);

        MilestoneStatus status = milestone.status;
        if (status != MilestoneStatus.Funded && status != MilestoneStatus.Completed) {
            revert InvalidStatus(status, MilestoneStatus.Funded);
        }

        milestone.status = MilestoneStatus.Refunded;
        uint256 amount = milestone.amount;

        (bool success,) = milestone.payer.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit MilestoneRefunded(milestoneId, milestone.payer, amount);
    }

    function openDispute(bytes32 milestoneId) external {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);

        address caller = msg.sender;
        if (caller != milestone.payer && caller != milestone.payee) {
            revert InvalidParticipant(caller);
        }

        MilestoneStatus status = milestone.status;
        if (status != MilestoneStatus.Funded && status != MilestoneStatus.Completed) {
            revert InvalidStatus(status, MilestoneStatus.Funded);
        }

        milestone.status = MilestoneStatus.Disputed;
        emit MilestoneDisputed(milestoneId);
    }

    function resolveDispute(bytes32 milestoneId, address recipient) external onlyOwner nonReentrant {
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.payer == address(0)) revert MilestoneNotFound(milestoneId);
        if (milestone.status != MilestoneStatus.Disputed) {
            revert InvalidStatus(milestone.status, MilestoneStatus.Disputed);
        }
        if (recipient != milestone.payer && recipient != milestone.payee) {
            revert InvalidParticipant(recipient);
        }

        milestone.status = MilestoneStatus.Released;
        uint256 amount = milestone.amount;

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit DisputeResolved(milestoneId, recipient, amount);
    }

    function getMilestone(bytes32 milestoneId) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }
}
