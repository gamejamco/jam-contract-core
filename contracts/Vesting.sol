/* SPDX-License-Identifier: UNLICENSED */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    struct Program {
        uint256 id;
        string name;
        uint256 start;
        uint256 end;
        uint256 availableAmount;
        uint256 tgeUnlockPercentage;
        uint256 unlockMoment;
        uint256 blockUnlockPercentage;
    }

    struct VestingInfo {
        uint256 claimedAmount;
        mapping(uint256 => uint256) atProgram;
    }

    uint256 public TGE;
    Program[] public allPrograms;
    uint256 private _block;
    mapping(address => bool) private _operators;
    mapping(address => VestingInfo) private _vestingInfoOf;

    event ProgramCreated(
        uint256 id,
        string name,
        uint256 start,
        uint256 end,
        uint256 initialAmount,
        uint256 tgeUnlockPercentage,
        uint256 unlockMoment,
        uint256 blockUnlockPercentage
    );
    event ParticipantRegistered(
        address participant,
        uint256 programId,
        uint256 amount
    );
    event ClaimSuccessful(address participant, uint256 amount);
    event EmergencyWithdrawn(address recipient, uint256 amount);

    constructor(uint256 block_) Ownable() {
        _block = block_;
        _operators[msg.sender] = true;
    }

    modifier onlyOperator() {
        require(_operators[msg.sender], "Caller is not operator");
        _;
    }

    function allProgramsLength() external view returns (uint256) {
        return allPrograms.length;
    }

    function getVestingAmount(address participant, uint256 programId)
        external
        view
        returns (uint256)
    {
        return _vestingInfoOf[participant].atProgram[programId];
    }

    function getClaimedAmount(address participants)
        external
        view
        returns (uint256)
    {
        return _vestingInfoOf[participants].claimedAmount;
    }

    function getClaimableAmount(address participants)
        public
        view
        returns (uint256)
    {
        if (TGE == 0) return 0;
        uint256 totalUnlockedAmount = 0;
        for (uint256 i = 0; i < allPrograms.length; i++) {
            uint256 vestingAmount = _vestingInfoOf[participants].atProgram[i];
            if (vestingAmount > 0) {
                Program memory program = allPrograms[i];
                if (block.timestamp >= TGE)
                    totalUnlockedAmount +=
                        (vestingAmount * program.tgeUnlockPercentage) /
                        10000;
                uint256 numUnlockTimes = (block.timestamp -
                    program.unlockMoment) /
                    _block +
                    1;
                totalUnlockedAmount +=
                    (vestingAmount *
                        program.blockUnlockPercentage *
                        numUnlockTimes) /
                    10000;
            }
        }
        return totalUnlockedAmount - _vestingInfoOf[participants].claimedAmount;
    }

    function setOperators(address[] memory operators, bool[] memory isOperators)
        external
        onlyOwner
    {
        require(operators.length == isOperators.length, "Lengths mismatch");
        for (uint256 i = 0; i < operators.length; i++)
            _operators[operators[i]] = isOperators[i];
    }

    function setBlockLength(uint256 block_) external onlyOperator {
        _block = block_;
    }

    function createPrograms(
        uint256 TGE_,
        string[] memory names,
        uint256[] memory starts,
        uint256[] memory ends,
        uint256[] memory initialAmounts,
        uint256[] memory tgeUnlockPercentages,
        uint256[] memory unlockMoments,
        uint256[] memory blockUnlockPercentages
    ) external onlyOperator {
        require(names.length == starts.length, "Lengths mismatch");
        require(names.length == ends.length, "Lengths mismatch");
        require(names.length == initialAmounts.length, "Lengths mismatch");
        require(
            names.length == tgeUnlockPercentages.length,
            "Lengths mismatch"
        );
        require(names.length == unlockMoments.length, "Lengths mismatch");
        require(
            names.length == blockUnlockPercentages.length,
            "Lengths mismatch"
        );
        require(TGE_ > 0, "TGE must be real moment");
        TGE = TGE_;
        for (uint256 i = 0; i < names.length; i++) {
            require(
                unlockMoments[i] > TGE_,
                "TGE must happen before unlock moment"
            );
            require(
                tgeUnlockPercentages[i] + blockUnlockPercentages[i] <= 10000,
                "Unlock percentages cannot exceed 100%"
            );
            uint256 id = allPrograms.length;
            allPrograms.push(
                Program(
                    id,
                    names[i],
                    starts[i],
                    ends[i],
                    initialAmounts[i],
                    tgeUnlockPercentages[i],
                    unlockMoments[i],
                    blockUnlockPercentages[i]
                )
            );
            emit ProgramCreated(
                id,
                names[i],
                starts[i],
                ends[i],
                initialAmounts[i],
                tgeUnlockPercentages[i],
                unlockMoments[i],
                blockUnlockPercentages[i]
            );
        }
    }

    function registerParticipant(address participant, uint256 programId)
        external
        payable
        onlyOperator
    {
        require(participant != address(0), "Register the zero address");
        require(programId < allPrograms.length, "Program does not exist");
        Program storage program = allPrograms[programId];
        require(block.timestamp >= program.start, "Program not available");
        require(block.timestamp <= program.end, "Program is over");
        require(
            msg.value <= program.availableAmount,
            "Available amount not enough"
        );
        _vestingInfoOf[participant].atProgram[programId] += msg.value;
        program.availableAmount -= msg.value;
        emit ParticipantRegistered(participant, programId, msg.value);
    }

    function claimTokens() external {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        _vestingInfoOf[msg.sender].claimedAmount += claimableAmount;
        (bool success, ) = payable(msg.sender).call{value: claimableAmount}("");
        require(success, "Claim tokens failed");
        emit ClaimSuccessful(msg.sender, claimableAmount);
    }

    function emergencyWithdraw(address payable recipient) external onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Emergency withdraw failed");
        emit EmergencyWithdrawn(recipient, amount);
    }
}