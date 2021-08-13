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

exports.query1 = query1;
exports.query2 = query2;