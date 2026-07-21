# AWS Free Tier VPS (EC2) Research & Guide

## 1. Executive Summary
Amazon Web Services (AWS) offers a robust Free Tier that allows developers to spin up a Virtual Private Server (VPS), known as an **EC2 Instance**, for free. This is an excellent option for hosting the backend (Elixir/Phoenix) and database (PostgreSQL) for Vokazi during the development and testing phases. 

However, AWS is notorious for accidental billing if limits are exceeded. This document outlines exactly how to get the account, what the limits are, and how to protect yourself from surprise charges.

---

## 2. Account Creation Requirements

To create an AWS account and access the Free Tier, you must have the following ready:

1. **A Valid Email Address:** This becomes your "Root User" email.
2. **A Mobile Phone Number:** AWS will send an SMS or call you with a verification code during signup.
3. **A Valid Credit or Debit Card:** 
   * **Crucial Note:** Even though the tier is free, AWS *requires* a card on file to verify your identity and prevent spam accounts. 
   * They will perform a temporary authorization hold (usually $1 USD) which is refunded shortly after. You will not actually be charged unless you exceed the free limits.
4. **Billing Address:** You must provide your physical or business address.

---

## 3. The AWS Free Tier Limits (Important!)

As of recent AWS updates, the Free Tier operates on a mix of monthly time limits and a credit system. For a VPS (EC2), here are the absolute limits you must stay under to pay $0.00:

### Compute (The VPS Itself)
* **Limit:** 750 hours per month.
* **What this means:** A month has 730-744 hours. This means you can run exactly **one** free-tier eligible instance 24/7 for the entire month without paying. If you run *two* instances 24/7, you will use 1,500 hours and be billed for the extra 750 hours.
* **Eligible Instance Types:** `t2.micro`, `t3.micro`, or `t4g.small` (this depends on the AWS Region you select). These instances usually have 1 vCPU and 1GB of RAM.

### Storage (The Hard Drive)
* **Limit:** 30 GB of EBS (Elastic Block Store) General Purpose (SSD) storage.
* **What this means:** When you launch your EC2 instance, you must assign a hard drive. Ensure the size is set to 30GB or less. 

### Data Transfer (Bandwidth)
* **Limit:** 100 GB of Outbound Data Transfer out to the internet per month.
* **What this means:** Data coming *into* AWS is free. Data going *out* (like serving your website to users) is free up to 100GB. For an MVP, you will rarely hit this limit unless you are serving heavy video/audio files.

---

## 4. Is 1GB RAM enough for Vokazi?

Because Vokazi uses **Elixir/Phoenix** (which is incredibly memory efficient) and PostgreSQL, you *can* fit the MVP on a 1GB RAM `t2.micro` instance. 

* **The Challenge:** Building/Compiling Elixir and React inside a 1GB RAM server will likely cause the server to crash due to "Out of Memory" (OOM) errors. 
* **The Solution:** You must configure a **Swap File** on your Ubuntu server immediately after launching it. A swap file uses a chunk of your 30GB hard drive as "fake RAM", allowing memory-heavy build processes to complete successfully without crashing the server.

---

## 5. Best Practices to Prevent Surprise Bills

If you follow these three steps immediately after creating your account, you will not get a surprise bill:

1. **Set up AWS Budgets:** Go to the Billing Dashboard -> Budgets. Create a "Zero Spend Budget". If your account incurs even $0.01 of charges, AWS will immediately email you.
2. **Always check "Free Tier Eligible":** Whenever launching a service, physically look for the little green badge that says "Free Tier eligible".
3. **Turn off unused resources:** If you stop an EC2 instance, you aren't charged for the compute hours, but you *are* still charged for the 30GB hard drive attached to it. If you abandon the project, you must **Terminate** the instance to delete the hard drive.

---

## 6. Step-by-Step Action Plan

1. Go to `aws.amazon.com/free` and click "Create a Free Account".
2. Enter your email, card details, and phone verification.
3. Once logged into the AWS Console, search for **EC2**.
4. Click **Launch Instance**.
5. Choose **Ubuntu 24.04 LTS** (ensure it has the "Free tier eligible" tag).
6. Choose instance type `t2.micro` or `t3.micro`.
7. Create and download a new **Key Pair** (a `.pem` file). **Do not lose this file**, it is the only way to SSH into your server.
8. Under Network Settings, allow SSH traffic from "Anywhere" (for now), and check the boxes to allow HTTP and HTTPS traffic.
9. Under Configure Storage, set the size to `30` GB.
10. Click **Launch Instance**.
