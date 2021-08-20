const graphqlClient = require('graphql-request');
const query1 = graphqlClient.gql`
        query ($network: EthereumNetwork!, $address: [String!]) {
        ethereum(network: $network) {
        address(address: {in: $address}) {
            smartContract {
            currency {
                tokenType
                symbol
                name
            }
            contractType
            }
            address
        }
        }
    }`;
const query2 = graphqlClient.gql`
    query ($network: EthereumNetwork!, $address: [String!]) {
        ethereum(network: $network) {
          transfers(currency: {in: $address}) {
            count
            currency {
              address
            }
          }
        }
      }
    `
const query3 = graphqlClient.gql`
query ($network: EthereumNetwork!, $address: [String!]){
  ethereum(network: $network) {
    transfers(
      currency: {in: $address}
      sender: {is: "0x0000000000000000000000000000000000000000"}
    ) {
      transaction {
        hash
      }
      block {
        timestamp {
          iso8601
        }
      }
      currency{
        address
      }
    }
  }
}
`
exports.query1 = query1;
exports.query2 = query2;
exports.query3 = query3;