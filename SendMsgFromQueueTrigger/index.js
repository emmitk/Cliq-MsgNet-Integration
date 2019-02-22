module.exports = async function (context, myQueueItem) {
    myQueueItem = "testmessage"; //for debug
    context.log('JavaScript queue trigger function processed work item', myQueueItem);
    var smsRequest = require("request");
    var smsMsg = "Welcome to Ausgrid " + myQueueItem;

    var lv_kv = GetEnvironmentVariable("MessageNetAPIKey")
    console.log(lv_kv);

    const lv_body = await callMessagenetPost();
    console.log(lv_body);
    

    context.bindings.outputTblStatus = [
      {
        PartitionKey: "Status",
        RowKey: "Send[1]",
        status:  lv_body + myQueueItem,
        run_date: "07/02/2019"
      }
    ];

    
function GetEnvironmentVariable(name)
{
//    return name + ": " + process.env[name];
    return process.env[name];
}

 /*
 From Postman

 Auth Key must be invalid
 Response => 401 Unauthorized
 Body =>
    {"message": "Authorization has been denied for this request." }
*/

 
  function callMessagenetPost() {  
    return new Promise((resolve, reject) => {
      console.log('Pre PostCall');
      let lv_msgnet_key = GetEnvironmentVariable("MessageNetAPIKey")
      console.log("Message key:" + lv_msgnet_key);
      smsRequest.post({
        "headers": { "content-type": "application/json", "Authorization": "Basic " + lv_msgnet_key, "Accept": "application/json" },
        "url": "http://api.messagenet.com.au/v2/message/simple_send",
        "body": JSON.stringify({
          "Message": smsMsg,
          "Recipient":"61433111696",
          "From":"Ausgrid Bot"    
        })
      }, (error, response, body) => {
        if(error) {
          context.log("error occured");  
          return console.dir(error);
      }
        resolve(body);
        console.dir(JSON.parse(body));
      }); 
      console.log('Post PostCall');
    });
  }  
};