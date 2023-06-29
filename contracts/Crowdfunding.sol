// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/*
 The Crowdfunding smart contract is intended to be a tool for supporting the growth
 and success of the YevMon team by providing a transparent and secure means
 for raising funds.
 The SC has different campaigns of fundraising with their own fund goals and end timelines.
 Campaigns can be added only by the owner
*/
contract Crowdfunding is Ownable {
    using SafeERC20 for IERC20;

    struct CampaignInfo {
        // sets as `true` only in case if owner claimed funds (goal for the fundraising is met)
        bool finished;
        uint32 startDate;
        uint32 endDate;
        uint256 fundingGoal;
        uint256 totalRaised;
        string name;
        string description;
    }

    // an ERC-20 token is used as a mechanism to accomplish a fundraising
    address public immutable mainToken;
    CampaignInfo[] public campaigns;

    // the total amount of `mainToken` that were pledged by the user for the certain campaign
    // user address -> campaignId -> totalAmount
    mapping(address => mapping(uint256 => uint256)) public pledgedFunds;

    // emits when an owner creates a new campaign
    event CampaignCreated(
        address indexed sender,
        uint256 fundingGoal,
        uint32 startDate,
        uint32 endDate
    );

    // emits when the user transfers funds to the smart contract
    event Pledged(
        address indexed sender,
        uint256 campaignId,
        uint256 amount,
        uint256 dateTime
    );

    // emits when a user transfers funds from the smart contract
    event Claimed(
        address indexed receiver,
        uint256 campaignId,
        uint256 amount,
        uint256 dateTime
    );

    // emits when an owner gets funds from the smart contract
    event ClaimedByOwner(
        address indexed receiver,
        uint256 campaignId,
        uint256 amount,
        uint256 dateTime
    );

    /**
     * @dev Raise an error if the certain campaign is not active
     * @param _campaignId is an ID of a campaign
     */
    modifier isActive(uint256 _campaignId) {
        require(_campaignId < campaigns.length, 'Invalid campaign Id');
        CampaignInfo memory _campaign = campaigns[_campaignId];
        require(
            _campaign.startDate <= block.timestamp &&
                _campaign.endDate >= block.timestamp,
            'The campaign is not active'
        );
        _;
    }

    /**
     * @dev Raise an error if the timeline is invalid
     * @param _startDate is an ID of a campaign
     * @param _endDate is an ID of a campaign
     */
    modifier isValid(uint32 _startDate, uint32 _endDate) {
        require(
            _startDate > block.timestamp,
            'The campaign`s start date must be more than current date'
        );
        require(
            _startDate < _endDate,
            'The campaign`s end date must be more than start date'
        );
        _;
    }

    /**
     * @dev Raise an error if the funding goal was not reached for the campaign
     * @param _campaignId is an ID of a campaign
     */
    modifier isRaised(uint256 _campaignId) {
        CampaignInfo memory _campaign = campaigns[_campaignId];
        require(
            _campaign.fundingGoal <= _campaign.totalRaised &&
                block.timestamp > _campaign.endDate,
            'The funding goal has not reached yet'
        );
        _;
    }

    /**
     * @dev Raise an error if the funding goal was reached for the campaign
     * @param _campaignId is an ID of a campaign
     */
    modifier isNotRaised(uint256 _campaignId) {
        CampaignInfo memory _campaign = campaigns[_campaignId];
        require(
            _campaign.fundingGoal > _campaign.totalRaised,
            'Can not claim. Funds successfully raised'
        );
        require(
            _campaign.endDate < block.timestamp,
            'The campaign has not finished yet'
        );
        _;
    }

    constructor(address _mainToken, address _owner) {
        require(
            _mainToken != address(0),
            'The main token address can not be zero'
        );
        require(_owner != address(0), 'The owner address can not be zero');
        mainToken = _mainToken;
        transferOwnership(_owner);
    }

    /**
     * @dev Create a campaign for sharing ideas for fundraising.
     * Pay attention there is no check for unique name of campaign, etc.
     * @param _fundingGoal is the amount of `mainToken` to achieve the campaign goal
     * @param _startDate is the start date of the campaign in seconds
     * @param _endDate is the end date of the campaign in seconds
     * @param _name is the name of the campaign
     * @param _description is the small description of the campaign
     */
    function createCampaign(
        uint256 _fundingGoal,
        uint32 _startDate,
        uint32 _endDate,
        string memory _name,
        string memory _description
    ) external onlyOwner isValid(_startDate, _endDate) {
        require(campaigns.length < 25, 'Maximum campaigns reached');
        require(_fundingGoal > 0, 'The funding goal can not be zero value');

        campaigns.push(
            CampaignInfo({
                finished: false,
                startDate: _startDate,
                endDate: _endDate,
                totalRaised: 0,
                fundingGoal: _fundingGoal,
                name: _name,
                description: _description
            })
        );

        emit CampaignCreated(msg.sender, _fundingGoal, _startDate, _endDate);
    }

    /**
     * @dev Fund a campaign
     * @param _campaignId is the chosen campaign Id by the user
     * @param _amount is the amount of `mainToken` that user want to transfer to the SC
     */
    function pledge(
        uint256 _campaignId,
        uint256 _amount
    ) external isActive(_campaignId) {
        require(_amount > 0, 'Pledged amount should be more than zero');

        CampaignInfo storage _campaign = campaigns[_campaignId];

        _campaign.totalRaised += _amount;
        pledgedFunds[msg.sender][_campaignId] += _amount;

        emit Pledged(msg.sender, _campaignId, _amount, block.timestamp);

        IERC20(mainToken).safeTransferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @dev The function sends all `mainToken` to the owner for the certain campaign
     * if the funding goal was reached
     * @param _campaignId is the chosen campaign Id by the owner
     */
    function getTokens(
        uint256 _campaignId
    ) external onlyOwner isRaised(_campaignId) {
        CampaignInfo storage _campaign = campaigns[_campaignId];
        require(
            !_campaign.finished,
            'Can not get tokens twice for the same campaign'
        );
        uint256 _amount = _campaign.totalRaised;
        _campaign.finished = true;

        emit ClaimedByOwner(msg.sender, _campaignId, _amount, block.timestamp);

        IERC20(mainToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Claim `mainToken` after the end date of the campaign if
     * the funding goal was not reached
     * @param _campaignId is the chosen campaign Id by the owner
     */
    function claim(uint256 _campaignId) external isNotRaised(_campaignId) {
        uint256 _amount = pledgedFunds[msg.sender][_campaignId];
        pledgedFunds[msg.sender][_campaignId] = 0;
        // campaigns[_campaignId].totalRaised -= _amount;

        emit Claimed(msg.sender, _campaignId, _amount, block.timestamp);

        IERC20(mainToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Returns all existing campaings
     * @return indexes is the indexes for the objects (can be used for UI)
     * @return campaignInfos is the objects with the information about
     * campaign according to its indexes
     */
    function getInfo()
        external
        view
        returns (uint256[] memory, CampaignInfo[] memory)
    {
        uint256[] memory indexes = new uint256[](campaigns.length);
        CampaignInfo[] memory infos = new CampaignInfo[](campaigns.length);

        for (uint256 i = 0; i < campaigns.length; i++) {
            indexes[i] = i; // to be sure that UI gets indexes and can read them properly
            infos[i] = campaigns[i];
        }

        return (indexes, infos);
    }
}
