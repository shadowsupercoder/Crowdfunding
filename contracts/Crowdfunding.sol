// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/*
 The Crowdfunding smart contract is intended to be a tool for supporting the growth
 and success of the YevMon team by providing a transparent and secure means
 for raising funds.
 The SC has different projects of fundraising with their own fund goals and end timelines.
 Projects can be added only by the owner
*/
contract Crowdfunding is Ownable {
    using SafeERC20 for IERC20;

    struct ProjectInfo {
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 startDate;
        uint256 endDate;
        string name;
        string description;
    }

    address public immutable mainToken; // an ERC-20 token is used as a mechanism to accomplish a fundraising
    ProjectInfo[] public projects;

    // the total amount of `mainToken` that were pledged by the user for the certain project
    // user address -> projectId -> totalAmount
    mapping(address => mapping(uint256 => uint256)) public pledgedFunds;

    // emits when an owner creates a new project
    event ProjectCreated(
        address indexed sender,
        uint256 fundingGoal,
        uint256 startDate,
        uint256 endDate
    );

    // emits when the user transfers funds to the smart contract
    event Pledged(
        address indexed sender,
        uint256 projectId,
        uint256 amount,
        uint256 dateTime
    );

    // emits when a user transfers funds from the smart contract
    event Claimed(
        address indexed receiver,
        uint256 projectId,
        uint256 amount,
        uint256 dateTime
    );

    /**
     * @dev Raise an error if the timeline for the certain project is not active
     * @param _projectId is an ID of a project
     */
    modifier isActive(uint256 _projectId) {
        ProjectInfo memory _project = projects[_projectId];
        require(
            _project.startDate <= block.timestamp &&
                _project.endDate >= block.timestamp,
            "The project is not active"
        );
        _;
    }

    /**
     * @dev Raise an error if the timeline is invalid
     * @param _startDate is an ID of a project
     * @param _endDate is an ID of a project
     */
    modifier isValid(uint256 _startDate, uint256 _endDate) {
        require(_startDate < _endDate, "The project has not started yet");
        _;
    }

    /**
     * @dev Raise an error if the funding goal was not reached for the project
     * @param _projectId is an ID of a project
     */
    modifier isRaised(uint256 _projectId) {
        ProjectInfo memory _project = projects[_projectId];
        require(
            _project.fundingGoal >= _project.totalRaised,
            "The funding goal has not reached yet"
        );
        _;
    }

    /**
     * @dev Raise an error if the funding goal was reached for the project
     * @param _projectId is an ID of a project
     */
    modifier isNotRaised(uint256 _projectId) {
        ProjectInfo memory _project = projects[_projectId];
        require(
            _project.fundingGoal < _project.totalRaised,
            "Funds successfully raised"
        );
        require(
            _project.endDate < block.timestamp,
            "The project has not finished yet"
        );
        _;
    }

    constructor(address _mainToken, address _owner) {
        require(
            _mainToken != address(0),
            "The monster address can not be zero"
        );
        require(_owner != address(0), "The owner address can not be zero");
        mainToken = _mainToken;
        transferOwnership(_owner);
    }

    /**
     * @dev Create a project for sharing ideas for fundraising
     * @param _fundingGoal is the amount of `mainToken` to achieve the project goal
     * @param _startDate is the start block of the project in seconds
     * @param _endDate is the end block of the project in seconds
     * @param _name is the name of the project
     * @param _description is the small description of the project
     */
    function createProject(
        uint256 _fundingGoal,
        uint256 _startDate,
        uint256 _endDate,
        string memory _name,
        string memory _description
    ) external onlyOwner isValid(_startDate, _endDate) {
        require(projects.length < 25, "Maximum projects reached");
        require(_fundingGoal > 0, "The funding goal can not be zero value");

        projects.push(
            ProjectInfo({
                totalRaised: 0,
                fundingGoal: _fundingGoal,
                startDate: _startDate,
                endDate: _endDate,
                name: _name,
                description: _description
            })
        );

        emit ProjectCreated(msg.sender, _fundingGoal, _startDate, _endDate);
    }

    /**
     * @dev Fund a project
     * @param _projectId is the chosen project Id by the user
     * @param _amount is the amount of `mainToken` that user want to transfer to the SC
     */
    function pledge(
        uint256 _projectId,
        uint256 _amount
    ) external isActive(_projectId) {
        require(_amount > 0, "Pledged amount should be more than zero");
        ProjectInfo storage _project = projects[_projectId];

        _project.totalRaised += _amount;
        pledgedFunds[msg.sender][_projectId] += _amount;

        emit Pledged(msg.sender, _projectId, _amount, block.timestamp);

        IERC20(mainToken).safeTransferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @dev The function sends all `mainToken` to the owner for the certain project
     * if the funding goal was reached
     * @param _projectId is the chosen project Id by the owner
     */
    function getTokens(
        uint256 _projectId
    ) external onlyOwner isRaised(_projectId) {
        ProjectInfo storage _project = projects[_projectId];
        uint256 _amount = _project.totalRaised;
        _project.totalRaised = 0;
        IERC20(mainToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Claim `mainToken` after the end date of the project if
     * the funding goal was not reached
     * @param _projectId is the chosen project Id by the owner
     */
    function claim(uint256 _projectId) external isNotRaised(_projectId) {
        ProjectInfo storage _project = projects[_projectId];
        uint256 _amount = pledgedFunds[msg.sender][_projectId];
        pledgedFunds[msg.sender][_projectId] = 0;
        _project.totalRaised -= _amount;

        emit Claimed(msg.sender, _projectId, _amount, block.timestamp);

        IERC20(mainToken).safeTransfer(msg.sender, _amount);
    }
}
