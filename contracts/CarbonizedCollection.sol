// SPDX-License-Identifier: MIT

// Celostrials | Carbonized nfETs

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CarbonizedCollection is Ownable, Pausable, ERC721Burnable {
	using SafeERC20 for IERC20;

	IERC721 originalCollection;
  IERC20 carbonCredit;
	uint256 public minCarbon;
	string public baseURI;
  string public baseExtension = ".json";
	mapping(uint256 => uint256) private deposit;

	constructor(address _originalCollection, address _carbonCredit, string memory name, string memory symbol) ERC721(name, symbol) {
		originalCollection = IERC721(_originalCollection);
		carbonCredit = IERC20(_carbonCredit);
		minCarbon = 10**IERC20Metadata(_carbonCredit).decimals();
	}

	function carbonize(uint256 tokenId, uint256 amount) public whenNotPaused {
		require (deposit[tokenId] == 0, "CarbonizedCollection: tokenId already carbonized");
		require (originalCollection.ownerOf(tokenId) == msg.sender, "CarbonizedCollection: tokenId is not owned by caller");
		require (amount >= minCarbon, "CarbonizedCollection: invalid carbon amount");
		carbonCredit.safeTransferFrom(msg.sender, address(this), amount);
		originalCollection.safeTransferFrom(msg.sender, address(this), tokenId);
		deposit[tokenId] = amount;
		mint(tokenId);
	}

	function decarbonize(uint256 tokenId) public {
		require (deposit[tokenId] != 0, "CarbonizedCollection: tokenId not carbonized");
		require (ownerOf(tokenId) == msg.sender, "CarbonizedCollection: caller is not the owner");
		burn(tokenId);
		originalCollection.safeTransferFrom(address(this), msg.sender, tokenId);
		carbonCredit.safeTransfer(msg.sender, deposit[tokenId]);
		deposit[tokenId] = 0;
	}

	function carbonizeBatch(uint256[] memory tokenIds, uint256[] memory amounts) external whenNotPaused {
		require(tokenIds.length == amounts.length, "CarbonizedCollection: invalid tokenIds and amounts");
			for (uint256 i = 0; i < tokenIds.length; i++) {
				carbonize(tokenIds[i], amounts[i]);
		}
	}

	function decarbonizeBatch(uint256[] memory tokenIds) external {
			for (uint256 i = 0; i < tokenIds.length; i++) {
				decarbonize(tokenIds[i]);
		}
	}

	function mint(uint256 tokenId) private {
		_safeMint(msg.sender, tokenId);
	}

}