// SPDX-License-Identifier: MIT

// Celostrials | Carbonized nfETs

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interface/ICarbonizedCollection.sol";

contract CarbonizedCollection is
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC721BurnableUpgradeable,
    ICarbonizedCollection
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    IERC721Upgradeable public originalCollection;
    IERC20Upgradeable public carbonCredit;
    uint256 public minCarbon;
    uint256 public maxCarbon;
    string public baseURI;
    string public baseExtension;
    mapping(uint256 => uint256) private carbonDeposit;

    function initialize(
        address _originalCollection,
        address _carbonCredit,
        string memory name,
        string memory symbol
    ) external virtual initializer {
        __Ownable_init();
        __ERC721_init(name, symbol);
        originalCollection = IERC721Upgradeable(_originalCollection);
        carbonCredit = IERC20Upgradeable(_carbonCredit);
        minCarbon = 10**IERC20Metadata(_carbonCredit).decimals();
        maxCarbon = 10 * minCarbon;
        baseExtension = ".json";
    }

    function carbonize(uint256 tokenId, uint256 amount) public whenNotPaused {
        require(carbonDeposit[tokenId] == 0, "CarbonizedCollection: tokenId already carbonized");
        require(
            originalCollection.ownerOf(tokenId) == msg.sender,
            "CarbonizedCollection: tokenId is not owned by caller"
        );
        require(amount >= minCarbon, "CarbonizedCollection: not enough carbon");
        require(amount <= maxCarbon, "CarbonizedCollection: too much carbon");
        carbonCredit.safeTransferFrom(msg.sender, address(this), amount);
        originalCollection.safeTransferFrom(msg.sender, address(this), tokenId);
        carbonDeposit[tokenId] = amount;
        mint(tokenId);
    }

    function decarbonize(uint256 tokenId) public {
        require(carbonDeposit[tokenId] != 0, "CarbonizedCollection: tokenId not carbonized");
        require(ownerOf(tokenId) == msg.sender, "CarbonizedCollection: caller is not the owner");
        burn(tokenId);
        originalCollection.safeTransferFrom(address(this), msg.sender, tokenId);
        carbonCredit.safeTransfer(msg.sender, carbonDeposit[tokenId]);
        carbonDeposit[tokenId] = 0;
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

    function carbonBalanceOf(uint256 tokenId) external view override returns (uint256) {
        return carbonDeposit[tokenId];
    }

    function ownerOf(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ICarbonizedCollection)
        returns (address owner)
    {
        return ERC721Upgradeable.ownerOf(tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, ICarbonizedCollection) {
        return ERC721Upgradeable.safeTransferFrom(from, to, tokenId);
    }

    function mint(uint256 tokenId) private {
        _safeMint(msg.sender, tokenId);
    }
}
