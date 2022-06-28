// SPDX-License-Identifier: MIT

// Celostrials | CarbonStaking

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract CarbonStaking is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public rewardsToken;
    IERC721 public stakingToken;
    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public rewardsDuration = 7 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    address public rewardsDistributor;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    // account => tokenId => staked
    mapping(address => mapping(uint256 => bool)) private carbonDeposit;
    mapping(address => uint256) private balances;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _rewardsDistributor,
        address _rewardsToken,
        address _stakingToken
    ) {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC721(_stakingToken);
        rewardsDistributor = _rewardsDistributor;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / _totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return (((balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18) + rewards[account]);
    }

    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * rewardsDuration;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 tokenId) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(
            stakingToken.ownerOf(tokenId) == msg.sender,
            "CarbonStaking: caller does not own token"
        );
        _totalSupply += 1;
        balances[msg.sender] += 1;
        stakingToken.safeTransferFrom(msg.sender, address(this), tokenId);
        carbonDeposit[msg.sender][tokenId] = true;
        emit Staked(msg.sender, tokenId);
    }

    function withdraw(uint256 tokenId) public nonReentrant updateReward(msg.sender) {
        require(carbonDeposit[msg.sender][tokenId], "CarbonStaking: token not deposited by caller");
        _totalSupply -= 1;
        balances[msg.sender] -= 1;
        stakingToken.safeTransferFrom(address(this), msg.sender, tokenId);
        carbonDeposit[msg.sender][tokenId] = false;
        emit Withdrawn(msg.sender, tokenId);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(uint256 reward)
        external
        onlyRewardsDistributor
        updateReward(address(0))
    {
        // handle the transfer of reward tokens via `transferFrom` to reduce the number
        // of transactions required and ensure correctness of the reward amount
        rewardsToken.safeTransferFrom(msg.sender, address(this), reward);

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;

        emit RewardAdded(reward);
    }

    // Added to support recovering LP Rewards from other systems such as BAL to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "Cannot withdraw the staking token");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function updateActiveRewardsDuration(uint256 _rewardsDuration)
        external
        onlyRewardsDistributor
        updateReward(address(0))
    {
        require(block.timestamp < periodFinish, "CarbonStaking: Reward period not active");
        require(_rewardsDuration > 0, "CarbonStaking: Reward duration must be non-zero");

        uint256 currentDuration = rewardsDuration;

        uint256 oldRemaining = periodFinish - block.timestamp;

        if (_rewardsDuration > currentDuration) periodFinish += _rewardsDuration - currentDuration;
        else periodFinish -= currentDuration - _rewardsDuration;

        require(periodFinish > block.timestamp, "CarbonStaking: new reward duration is expired");

        uint256 leftover = oldRemaining * rewardRate;
        uint256 newRemaining = periodFinish - block.timestamp;
        rewardRate = leftover / newRemaining;

        rewardsDuration = _rewardsDuration;

        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setRewardsDistribution(address _rewardsDistributor) external onlyOwner {
        rewardsDistributor = _rewardsDistributor;
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    modifier onlyRewardsDistributor() {
        require(msg.sender == rewardsDistributor, "Caller is not RewardsDistributor");
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 tokenId);
    event Withdrawn(address indexed user, uint256 tokenId);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
}
