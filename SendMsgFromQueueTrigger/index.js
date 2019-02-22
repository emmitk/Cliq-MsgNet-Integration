module.exports = async function (context, myQueueItem="DebugMsg") {
  context.log('JavaScript queue trigger function processed work item', myQueueItem);
  var smsRequest = require("request");
  var smsMsg = myQueueItem;
  var lv_rowKey = "";

  const lv_body = await callMessagenetPost();
  context.log(JSON.stringify(lv_body));

  lv_rowKey = "Send-" + btoa(lv_body);
  
  context.bindings.outputTblStatus = [
    {
      PartitionKey: "Status",
      RowKey: lv_rowKey,
      status:  lv_body + myQueueItem,
      run_date: getDate()
    }
  ];
  
function GetEnvironmentVariable(name)
{
//    return name + ": " + process.env[name];
  return process.env[name];
}

function getDate()
{
var today = new Date();
var dd = today.getDate();
var mm = today.getMonth() + 1; //January is 0!

var yyyy = today.getFullYear();
if (dd < 10) {
  dd = '0' + dd;
} 
if (mm < 10) {
  mm = '0' + mm;
} 
var today = dd + '/' + mm + '/' + yyyy;
return today;
} 

function callMessagenetPost() {  
  return new Promise((resolve, reject) => {
    let lv_msgnet_key = GetEnvironmentVariable("MessageNetAPIKey")
//      context.log("Message key:" + lv_msgnet_key); // comment out

    smsRequest.post({
      "headers": { "content-type": "application/json", "Authorization": "Basic " + lv_msgnet_key, "Accept": "application/json" },
      "url": "http://api.messagenet.com.au/v2/message/simple_send",
      "body": JSON.stringify({
        "Message": smsMsg,
        "Recipient":"61433111696", // <= Change Phone Number
        "From":"Ausgrid Property"    
      })
    }, (error, response, body) => {
      if(error) {
        context.log("error occured");  
        return console.dir(error);
    }
      resolve(body);
      console.dir(JSON.parse(body));
    }); 

    
//      console.log('Post PostCall');
  });
}  
};