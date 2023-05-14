// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract IceToken is ERC20, Ownable {
    constructor() ERC20('Roman Ice', 'RICE') {
    }

    /*
    * @dev A simple function that can min unlimited tokens to the owner of the token
    * @param _amount is the amount of tokens in wei
    */
    function mint(uint256 _amount) external onlyOwner {
    	_mint(msg.sender, _amount);
    }
}
