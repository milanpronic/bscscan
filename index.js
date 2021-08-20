const fs = require("fs");
const axios = require('axios');
const cheerio = require('cheerio');
const graphqlClient = require('graphql-request');
const cliProgress = require('cli-progress');
const {config} = require('./config');
const {query1, query2, query3} = require('./query');
var jsonFormat = require('json-format');

var load_data;

const getTokenInfo = async (input) => {
    var output = input;
    const {data} = await axios("https://api.bscscan.com/api?module=contract&action=getsourcecode&address=" + input["address"] + "&apikey=" + config.apiKey)
    if(data.status == '1' && data.message == 'OK') {
        output["verified"] = (data.result[0].ABI != "Contract source code not verified");
        output["contract_name"] = data.result[0].ContractName
        output["compiler_version"] = data.result[0].CompilerVersion.split("+")[0]
    } else {
        console.log(data);
    }
    const url = "https://bscscan.com/token/" + input["address"];
    const res = await axios(url);
    const $ = cheerio.load(res.data);
    output["total_supply"] = parseFloat($(".card-body .hash-tag.text-truncate").text().split(",").join(""));
    output["holders"] = parseInt($("#ContentPlaceHolder1_tr_tokenHolders .mr-3").text().split(",").join(""));
    // console.log(output);
    return output;
}

const getTokenAddresses = async (keyword) => {
    var res = await axios("https://bscscan.com/searchHandler?term=" + keyword + "&filterby=0");
    
    return res.data.map(row => {
        if(match = row.match(/0x[0-9a-fA-F]{40}/g)) {
            return match[0];
        } else return null
    }).filter(row => row != null);
}

const isLowerVersion = (v1, v2) => {
    str1 = v1.toLowerCase();
    str2 = v2.toLowerCase();
    if(str1.substring(0, 1) == 'v') str1 = str1.substring(1);
    if(str2.substring(0, 1) == 'v') str2 = str2.substring(1);
    str1 = str1.split(".");
    str2 = str2.split(".");
    // console.log(str1);
    // console.log(str2);
    for(i = 0; i < 3; i ++) {
        if(str1[i] > str2[i]) return false;
        if(str1[i] < str2[i]) return true;
    }
    return false;
}

const scan = async (keyword) => {
    console.log(`keyword search: ${keyword}`);
    const addresses = await getTokenAddresses(keyword);
    console.log(addresses);
    return;
    const client = new graphqlClient.GraphQLClient("https://graphql.bitquery.io", { headers: {} })
    
    ql_result = await client.request(query1, {
        "network":"bsc",
        "address": addresses
    });
    ql_result = ql_result.ethereum.address
    print_data = ql_result.map(data => {
        return {address: data.address, contract_type: data.smartContract?.contractType, token_name: data.smartContract?.currency?.name};
    });
    print_data = print_data.filter(row => row.token_name != undefined && (config.keyword && row.token_name?.toLowerCase().indexOf(config.keyword?.toLowerCase()) != -1));
    const new_addresses = print_data.map(row=>row.address);
    ql_result = await client.request(query2, {
        "network":"bsc",
        "address": new_addresses
    });
    ql_result = ql_result.ethereum.transfers;
    var transfers = {};
    ql_result.map(row => {
        transfers[row.currency.address] = row.count;
    })
    print_data = print_data.map(row => {
        return {...row, transfers: transfers[row.address]}
    })
    ql_result = await client.request(query3, {
        "network":"bsc",
        "address": new_addresses
    });
    ql_result = ql_result.ethereum.transfers;
    var create_date = {};
    ql_result.map(row => {
        create_date[row.currency.address] = row.block.timestamp.iso8601.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})Z/g, '$1 - $2');
    })
    print_data = print_data.map(row => {
        return {...row, create_date: create_date[row.address]}
    })
    // print_data.splice(10);
    console.table(print_data);
    
    console.log("getting details by address");
    const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar2.start(print_data.length, 0);
    for(var i = 0; i < print_data.length; i ++) {
        find_ele = load_data.find((row) => {
            return row.address == print_data[i].address;
        });
        if(find_ele) print_data[i] = { ...find_ele, ...print_data[i] };
        else print_data[i] = await getTokenInfo(print_data[i]);
        bar2.update(i+1);
    }
    bar2.stop();
    // console.table(print_data);
    // fs.writeFile("save.json", JSON.stringify(print_data), (err) => {
    //     if (err) console.log(err);
    //     console.log("Successfully Written to File.");
    // });
    const filtered_data = print_data.filter(row => {
        if(config.keyword && row.token_name?.toLowerCase().indexOf(config.keyword?.toLowerCase()) == -1) return false;
        if(config.totalSupply && row.total_supply != config.totalSupply) return false;
        if(config.maxHolders && row.holders > config.maxHolders) return false;
        if(config.maxTransfers && row.transfers > config.maxTransfers) return false;
        if(config.compilerVersion && isLowerVersion(row.compiler_version, config.compilerVersion)) return false;
        return true;
    })
    console.table(filtered_data);
    fs.writeFile("save.json", jsonFormat(filtered_data), (err) => {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
    });
}

// console.log(isLowerVersion('V1.2', ''));
fs.readFile("save.json", function(err, buf) {
    if(buf.toString()) {
        load_data = JSON.parse(buf.toString());
    }
    else {
        load_data = [];
    }
});
// console.log(isLowerVersion("v0.7.6", "0.8.3"));
scan(config.keyword);
// console.log(jsonFormat({"name": "rjs", "age": 13}));