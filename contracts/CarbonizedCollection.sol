// SPDX-License-Identifier: MIT

// Celostrials | Carbonized nfETs

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interface/ICarbonizedCollection.sol";
import "./interface/ICarbonRewards.sol";

contract CarbonizedCollection is
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC721EnumerableUpgradeable,
    IERC721ReceiverUpgradeable,
    ICarbonizedCollection
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    IERC721Upgradeable public originalCollection;
    IERC20Upgradeable public carbonCredit;
    ICarbonRewards public rewards;
    uint256 public minCarbon;
    uint256 public maxCarbon;
    string public baseURI;
    string public baseExtension;
    // tokenId => carbonAmount
    mapping(uint256 => uint256) public carbonDeposit;
    uint256 public totalCarbon;

    function initialize(
        address _originalCollection,
        address _carbonCredit,
        address _carbonRewards,
        string memory name,
        string memory symbol
    ) external virtual initializer {
        __Ownable_init();
        __ERC721_init(name, symbol);
        originalCollection = IERC721Upgradeable(_originalCollection);
        rewards = ICarbonRewards(_carbonRewards);
        carbonCredit = IERC20Upgradeable(_carbonCredit);
        minCarbon = 10**IERC20Metadata(_carbonCredit).decimals();
        maxCarbon = 2 * minCarbon;
        baseExtension = ".json";
        baseURI = "https://ipfs.io/ipfs/QmTn1W5CpTdqrkvdSLb7nXGWVYYmoTWMv8N2ripQthXw2v/";
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function carbonize(uint256 tokenId, uint256 amount) public whenNotPaused {
        require(carbonDeposit[tokenId] == 0, "CarbonizedCollection: tokenId already carbonized");
        require(amount >= minCarbon, "CarbonizedCollection: not enough carbon");
        require(amount <= maxCarbon, "CarbonizedCollection: too much carbon");
        carbonCredit.safeTransferFrom(msg.sender, address(this), amount);
        originalCollection.safeTransferFrom(msg.sender, address(this), tokenId);
        carbonDeposit[tokenId] = amount;
        totalCarbon += amount;
        mint(tokenId);
        rewards.updateReward(msg.sender);
    }

    function decarbonize(uint256 tokenId) public {
        require(carbonDeposit[tokenId] != 0, "CarbonizedCollection: tokenId not carbonized");
        _burn(tokenId);
        originalCollection.safeTransferFrom(address(this), msg.sender, tokenId);
        carbonCredit.safeTransfer(msg.sender, carbonDeposit[tokenId]);
        totalCarbon -= carbonDeposit[tokenId];
        carbonDeposit[tokenId] = 0;
        rewards.updateReward(msg.sender);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        rewards.updateReward(from);
        rewards.updateReward(to);
        super._transfer(from, to, tokenId);
    }

    function carbonizeBatch(uint256[] memory tokenIds, uint256[] memory amounts)
        external
        whenNotPaused
    {
        require(
            tokenIds.length == amounts.length,
            "CarbonizedCollection: invalid tokenIds and amounts"
        );
        for (uint256 i = 0; i < tokenIds.length; i++) {
            carbonize(tokenIds[i], amounts[i]);
        }
    }

    function decarbonizeBatch(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            decarbonize(tokenIds[i]);
        }
    }

    function carbonBalance(address account) external view override returns (uint256 carbon) {
        (, uint256[] memory balances) = walletOfOwner(account);
        for (uint256 i = 0; i < balances.length; i++) {
            carbon += balances[i];
        }
    }

    function setMinCarbon(uint256 _minCarbon) external onlyOwner {
        minCarbon = _minCarbon;
    }

    function setMaxCarbon(uint256 _maxCarbon) external onlyOwner {
        maxCarbon = _maxCarbon;
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function mint(uint256 tokenId) private {
        _safeMint(msg.sender, tokenId);
    }

    function walletOfOwner(address _owner)
        public
        view
        returns (uint256[] memory, uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        uint256[] memory balances = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
            balances[i] = carbonDeposit[tokenIds[i]];
        }
        return (tokenIds, balances);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}
