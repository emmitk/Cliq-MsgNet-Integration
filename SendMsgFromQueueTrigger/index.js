module.exports = async function (context, myQueueItem="DebugMsg") {
  context.log('JavaScript queue trigger function processed work item', myQueueItem);
  var smsRequest = require("request");
  var lv_rowKey = "";
  var lv_msg = "";
  var lv_msgType = "";
  var lv_body = {};

/* myQueueItem should be a JSON item similar to below
{
   "type":"sms",
   "number": "614xxxxxxxx",
   "sender": "AUSGRID Property",
   "subject": "Subject heading", //<= t his is ignored for sms messages
   "msg": "Some message"
}
*/    

  try{
    lv_msg = JSON.parse(myQueueItem); // <=myQueueItem is a JSON object
    lv_msgType = lv_msg["type"];
    context.log("QueueItem:" + JSON.stringify(lv_msg));

  }
  catch(err) {
    lv_msg = myQueueItem; //<= myQueueItem is NOT a JSON object
    lv_msgType = "sms"; //Default to sms
    context.log("QueueItem:" + myQueueItem);
  }
  //context.log(lv_msgType);
  if (lv_msgType == "sms") // alternative can be email
  {
    //context.log("in SMS");
    var smsMsg = lv_msg["msg"];
    var smsRecipient = lv_msg["number"];
    var smsFrom = lv_msg["sender"];
    lv_body = await callMessagenetPost(); // Call the SMS Send
  }  
//context.log("After SMS");
//context.log(lv_body);

lv_body_json = JSON.parse(lv_body);

if (lv_body_json["StatusCode"] == 200)
{
  if (lv_body == undefined)
  {
    context.log("Error: Call to messagenet returned an error.");
    lv_rowKey = "Send-Error-" + lv_body;
  }  
  else  
  {
    lv_rowKey = "Send-MsgId:" + lv_body_json["Data"]["Message"]["MessageId"] + "-TrackingId:" + lv_body_json["Data"]["Message"]["TrackingId"];
    context.log("Success: Call to messagenet returned: " + lv_body_json["StatusCode"] + "-" + lv_body_json["Status"]);
  }  
  
  context.log("rowKey=" + lv_rowKey);
  context.bindings.outputTblStatus = [
    {
      PartitionKey: "ItemStatus",
      RowKey: lv_rowKey,
      MessageDate: getDate(),
      MessageStatus: lv_body_json["StatusCode"] + "-" + lv_body_json["Status"],
      SendStatus:  lv_body_json["Data"]["Message"]["Status"],
      MessageId: lv_body_json["Data"]["Message"]["MessageId"],
      TrackingId: lv_body_json["Data"]["Message"]["TrackingId"],
      MessageLog: lv_body,
      Message: myQueueItem
    }
  ];
} else {
  context.log("Error: Call to messagenet returned an error");
  context.bindings.outputTblStatus = [
    {
      PartitionKey: "ItemStatus",
      RowKey: "ErrorSending-" + Date.now(),
      MessageDate: getDate(),
      MessageStatus: lv_body_json["statusCode"] + "-" + lv_body_json["status"],
      MessageLog: lv_body,
      Message: myQueueItem
    }
  ];
    
}
  
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
        "Recipient": smsRecipient, // <= Change Phone Number
        "From": smsFrom    
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