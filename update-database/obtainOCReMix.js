const redis = require('redis')
const helpers = require('ocremix-helpers')
const AWS = require("aws-sdk")

function awsConfig(awsConfiguration) {
    AWS.config.update({
        region: awsConfiguration.region,
        endpoint: awsConfiguration.endpoint
    })
}

function getCachedData(redisConfiguration) {
    return new Promise((resolve, reject) => {
        let redisClient = redis.createClient(redisConfiguration.PORT, redisConfiguration.HOSTNAME)
        redisClient.auth(redisConfiguration.PASSWORD, err => {
        if (err) {
            redisClient.quit()
            reject(err)
        }
        })
        redisClient.get(redisConfiguration.KEY, (err, reply) => {
            if (err) {
                redisClient.quit()
                reject(err)
            } else {
                redisClient.quit()
                resolve(reply)
            }
        })
    })
}

function createDynamoTable(awsConfiguration) {
    awsConfig(awsConfiguration)
    return new Promise((resolve, reject) => {
        const dynamodb = new AWS.DynamoDB()
        let params = {
            TableName : awsConfiguration.dynamoTable,
            KeySchema: [       
                { AttributeName: "year", KeyType: "HASH"},  //Partition key
                { AttributeName: "title", KeyType: "RANGE" }  //Sort key
            ],
            AttributeDefinitions: [       
                { AttributeName: "year", AttributeType: "N" },
                { AttributeName: "title", AttributeType: "S" }
            ],
            ProvisionedThroughput: {       
                ReadCapacityUnits: 5, 
                WriteCapacityUnits: 5
            }
        }

        dynamodb.createTable(params, (err, data) => {
            let tableAlreadyCreated = err && err.message === 'Cannot create preexisting table'
            let tableAlreadyExists = err && err.message.includes('Table already exists')
            let tableExists = tableAlreadyCreated || tableAlreadyExists
            if (err && !tableExists) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2))
                reject(err)
            } else if (tableExists) { 
                console.log('Table already created')
                resolve(false)
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2))
                resolve(data)
            }
        })
    })
}

function putItemToTable(item, awsConfiguration) {
    const docClient = new AWS.DynamoDB.DocumentClient()
    return new Promise((resolve, reject) => {
        var params = {
            TableName: awsConfiguration.dynamoTable,
            Item: {
                "year":  item.year,
                "title": item.title,
                "torrentUri":  item.torrentUri,
                "size": item.size,
                "info": item.info,
                "added": item.added,
                "category": item.category,
                "magnetUri": item.magnetUri
            },
            ConditionExpression: "attribute_not_exists(title) OR magnetUri <> :magnet",
            ExpressionAttributeValues:{
                ":magnet":item.magnetUri,
            }
        }

        docClient.put(params, (err, data) => {
            let itemExistsAlready = err && err.code === 'ConditionalCheckFailedException'
            if (err && !itemExistsAlready) {
                console.error("UNABLE TO ADD:", item.title, ". Error JSON:", JSON.stringify(err, null, 2))
                reject(err)
            } else if (itemExistsAlready) {
                console.log("UNCHANGED:", item.title)
                resolve(false)
            }else {
                console.log("CHANGED:", item.title)
                resolve(true)
            }
        })
    })
}

function fromCacheToTable(configuration) {
    return new Promise((resolve, reject) => {
        createDynamoTable(configuration.aws)
            .then(_ => {
                getCachedData(configuration.redis)
                    .then(payload => {
                        let payloadJson = JSON.parse(payload)
                        payloadJson.forEach(item => {
                            let date = new Date(item.added)
                            item.year = date.getFullYear()
                        })
                        let promises = payloadJson.map(item => putItemToTable(item, configuration.aws))
                        Promise.all(promises)
                            .then(results => {
                                console.log('DynamoDB Refresh process finished')
                                if(results.every(a => !a)) {
                                    resolve('NO UPDATES')
                                } else if(results.every(a => a)) {
                                    resolve('ALL UPDATED')
                                } else {
                                    resolve('NEW UPDATES')
                                }
                            })
                            .catch(e => {  
                                reject(`DynamoDB Refresh process error: ${e}`)
                            })
                    })
                    .catch(e => {
                        reject(e)
                    })
            })
            .catch(e => {
                reject(e)
            })
    })
}

module.exports = {
    fromCacheToTable: fromCacheToTable,
    _ : {
        getCachedData: getCachedData,
        createDynamoTable: createDynamoTable,
        fromCacheToTable: fromCacheToTable
    }
}