export const logBalanceMsg = async (name: string, balance: string) => {
  /*
    prints balance of tokens for the certain user into console
  */
  console.log(
      `\t\t 💰 ${name} has\x1b[33m`,
      balance,
      `\x1b[0mtokens`
    );
};
