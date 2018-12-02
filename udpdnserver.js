module.exports = function(RED) {

   // Gippsman2017/node-red-contrib-udpdnserver
   
"use strict";

const dgram      = require('dgram');// UDP inputs
const response   = require('./response.js');
const utils      = require('./utils.js');
const packet	 = require('../native-dns-packet');
const path       = require('path');
var   udpServer  = null;
var   upstream   = '';    // hold the upstream dns server address
var   upport     = 53;    // hold the upstream dns server port 
var   alasql     = require('alasql');

function udpdnsServerNode(config) {

   RED.nodes.createNode(this,config);

   var node = this;

   if (node != null) {
     // This is run or re-run every time the node is started or deployed.
     // Create UDP Server
     udpServer = dgram.createSocket('udp4');
     udpServer.bind(config.port,config.address);
     
     // Create the database and alaSQL functions, pull them in from the node config screen;
     let msg1  = {};
     msg1.sql  =  config.functions + ' ';
     doSQL(msg1).then (result => {
     node.send([null,null,{payload:result}]);
       });
     };

//------------------------------------------ Node alaSQL Transactions -------------------------------------     

   function doSQL(msg) {
     var   sql       = msg.sql || 'SELECT * FROM ?';
     var   bind      = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
     return alasql.promise(sql, [bind])
       .then (function (res) {
          msg.sqlResult = res;
          return msg;
         })
       .catch((err) => {
          msg.error = err;
          return msg;
         });
       };

   node.on("input", function(msg) {
     doSQL(msg).then(result=>{
        node.send([null,null,{payload:result}]);
     //        node.status({fill: "green", shape: "dot", text: ' Records: ' + msg.payload.length});
        });
     });

   node.on("close", function(done) { 
     udpServer.close(); // Close the UDP server 
     let msg1     = {};
     msg1.sql= 'DROP DATABASE '+config.name;
     doSQL(msg1).then (result => {
       });
     done();
     });

//----------------------------------------- UDP Socket Transactions --------------------------------
   udpServer.on('listening', function () {
//     console.log('listening on port 53');
     })

   udpServer.on('error', function (error) {
//     console.log('error: ', error);
     })

   udpServer.on('message', function (msg, info) {
     let question = utils.recombinationQuestion(msg);
     let domain   = utils.getDomain(msg);
     let ip       = ''; 
     let msg1     = {};
     //  get a random address from the cache for this domain 
     msg1.sql='select uds_resolveIPV4Address("'+domain+'") rr;';
     doSQL(msg1).then (result => {
     let address = result.sqlResult[0].rr["address"];
     if  (address != 'none') {
        node.send([null,null,{payload:'CACHED',sql:'CACHED RESULT',sqlResult:result.sqlResult[0].rr}]); 
        ip = address;
        };
     let cName = '';
     let addr  = '';
     let rr    = {};
     if (ip) { // Ok, it's in my cache
        let answer = response(msg, ip);
        let result = Buffer.concat([question,answer]);
        node.send([
            {payload:{result:"cached",dns:'127.0.0.1',domain:domain,toAddr:info.address,toPort:info.port,cName:cName,addr:ip,rr:rr}},
            {payload:packet.parse(result),infoAddr:info.address,infoPort:info.port},
            null]);
        udpServer.send(result, info.port, info.address) //Send this result to the caller.
        } 
     else // Ok, it wasnt in my cache so go and resolve it upstream
        {
        msg1.sql='select uds_getUpstreamAddress() rr';
        doSQL(msg1).then (result => {
          upport   = result.sqlResult[0].rr.port;
          upstream = result.sqlResult[0].rr.address;
          });
        utils.resolve(msg, upport, upstream, function (data) {
          let result = packet.parse(data);
          if (result.answer.length === 0) { //No-one knows about his domain
            node.send([
             {payload:{result:"nxdomain",dns:upstream,domain:domain,toAddr:info.address,toPort:info.port,addr:addr,rr:rr}},
             {payload:data,infoAddr:info.address,infoPort:info.port},
             null
              ]);
            }
//       else // The upstream dns found it.
//          {
//          }
          
          node.send([
            {payload:{result:"resolved",dns:upstream,domain:domain,infoAddr:info.address,toPort:info.port,cName:cName,addr:addr,rr:result.answer}},
            {payload:result,infoAddr:info.address,infoPort:info.port},
            null]);
          udpServer.send(data, info.port, info.address); //Send this result to the calling client
          }); // utils.resolve
        }
       });   
     }) //udpServer.on
    }

//------------------------------------------------------- Register this Node --------------------------------
    RED.nodes.registerType("udpdnserver", udpdnsServerNode);
}    
   
