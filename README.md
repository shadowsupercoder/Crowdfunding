# Crowdfunding
A Crowdfunding smart contract provides campaigns where users can pledge and claim funds to, and claim funds from, the contract. 
- Funds take the form of a custom IceToken token.
- Each crowdfunded project have a funding goal
- When a funding goal is not met, customers can get a refund of their pledged funds

## Setup

### Install Dependencies

Execute: `yarn install`

### Compile contracts

Execute: `yarn hardhat compile`

### Update REPORT_GAS in the .env file

`REPORT_GAS` variable is needed to check gas usage for transaction for different functions in the smart contract.

1. Open or create the .env file
2. Update the `REPORT_GAS=true` if it needs to enable the gas data table

### Run tests

Use `yarn test` to check tests created for the Crowdfunding smart contract and its tasks for easy deploymanet and easy communication with smart contracts(Crowdfunding, IceToken) without UI. In the `test/Tasks.ts` file are stored two DEMOs to fast check if the functionality works as expected. DEMOs are displayed balances and actions for two scenarios:
- DEMO 1: the user can claim his funds back if funds goal isn't met
- DEMO 2: the owner can get tokens from SC if funds goal is met
Attention! The `IceToken` was not tested!

### Tests coverage

Use `yarn coverage` if it needs to check tests coverage.
Check the `coverage/` directory to see detailed HTML reports that were covered by tests.

### Check security issues
Install a [Slither](https://github.com/crytic/slither) framework for your IDE as an extension and execute it accordingly for smart contracts
or
1. Create a virtual enviroment %`python3 -m venv .venv`
2. Activate the virtual enviroment %`source .venv/bin/activated`
3. Install the required library %`pip3 install slither-analyzer`
4. Execute %`slither .`
5. To deactivate the enviroment execute the %`deactivate` command

## Prerequisites
To check Crowdfunding smart contract functionality use the following steps:

## Steps

1. Run the hardhat node via `yarn hardhat node` command. Keep it running in the separate terminal window.
2. Deploy your own IceToken contract which will be the main fund token of the Crowdfunding smart contract (SC). An owner address of the Token will be the first address on the list from the first terminal window. For token deployment use the following command:

```
  yarn hardhat deploy-token --network localhost
```
3. Deploy the Crowdfunding SC and use an IceToken address that displayed after its deploying. For Crowdfunding deployment use the following command:

```
  yarn hardhat deploy --network localhost \
    --token <deployed IceToken address> \
    --owner <Account #0 address from the list of test addresses>
```
4. Create a new campaign in the Crowdfunding SC. Each campaign Id created automatically from 0 and increases per 1 for each campaign creation. Max amount of campaigns is 25. Only the owner can create a campaign. Set all parameters for this campaign including timeline and description. Use the following command:

```
  yarn hardhat create --network localhost \
    --cf <deployed Crowdfunding address> \
    --goal <any amount in wei to meet raise, Ice Token has 18 decimals> \
    --start <any datetime in the future (Unix Timestamp) > \
    --end <any datetime in the future that is more than `start` parameter> \
    --name '<a short name of the campaign>' \
    --description '<a long description of the campaign>'
```
5. Mint some Ice tokens to the owner use the following command:

```
  yarn hardhat mint --network localhost \
    --token <deployed IceToken address> \
    --amount <any amount in wei>
```

6. Transfer some amount of Ice tokens from one account to another one use the following command:

```
  yarn hardhat transferFrom --network localhost \
    --token <deployed IceToken address> \
    --from <the sender address of the tokens>
    --to <the receiver address of the tokens>
    --amount <any amount in wei that a `from` address has>
```
7. Approve Ice tokens from `sender` for `spender` address. A `sender` is an account that already have some amount of Ice tokens but he is not the owner of smart contracts. To fund some tocens to the Crowdfunding SC put a Crowdfunding address as a value for `--to` parameter. Use the following command:

```
  yarn hardhat approve --network localhost \
    --token <deployed IceToken address> \
    --from <the sender address of the tokens>
    --to <the spender address of the tokens>
    --amount <any amount in wei that should be approved>
```
8. Transfer tokens from the `sender` to the crowdfunding SC using the following command:

```
  yarn hardhat pledge --network localhost \
    --from <the sender address of the tokens>
    --crowdfunding <deployed Crowdfunding address>
    --id <The campaign Id that was already created by the Crowdfunding SC>
    --amount <any amount in wei that should be transferred to the Crowdfunding address>
```
9. Claim all tokens from the Crowdfunding SC for the certain campaign Id if the raise isn't met. Use the following command:

```
  yarn hardhat claim --network localhost \
    --from <the address of the token owner>
    --crowdfunding <deployed Crowdfunding address>
    --id <The campaign Id that was already created by the Crowdfunding SC>
```
10. Claim all tokens from the Crowdfunding SC for the certain campaign Id if the raise is met. Only owner can execute this function. Use the following command:

```
  yarn hardhat getTokens --network localhost \
    --from <the owner address of the Crowdfunding SC>
    --crowdfunding <deployed Crowdfunding address>
    --id <The campaign Id that was already created by the Crowdfunding SC>
```
