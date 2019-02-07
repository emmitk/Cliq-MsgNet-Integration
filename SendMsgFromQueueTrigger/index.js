module.exports = async function (context, myQueueItem) {
    context.log('JavaScript queue trigger function processed work item', myQueueItem);
    var smsRequest = require("request");
    var smsMsg = "Welcome to Ausgrid " + myQueueItem;

    const lv_body = await callMessagenetPost();
    console.log(lv_body);
    
    var lv_kv = GetEnvironmentVariable("MessageNetAPIKey")
    console.log(lv_kv);

    context.bindings.outputTblStatus = [
      {
        PartitionKey: "Status",
        RowKey: "Send[1]",
        status: "Success:" + lv_body,
        run_date: "07/02/2019"
      },
      {
        PartitionKey: "Status",
        RowKey: "KeyVaultValue",
        status: "Success:" + lv_kv,
        run_date: "07/02/2019"
      }
    ];


    
function GetEnvironmentVariable(name)
{
    return name + ": " + process.env[name];
}
/*    smsRequest.post({
      "headers": { "content-type": "application/json", "Authorization": "Basic ZW1taXQua2FkYXlpZmNpOnNtc1Bhc3Mx", "Accept": "application/json" },
      "url": "http://api.messagenet.com.au/v2/message/simple_send",
      "body": JSON.stringify({
        "Message": smsMsg,
        "Recipient":"61433111696",
        "From":"Ausgrid Bot"    
      })
    }, (error, response, body) => {
      if(error) {
        context.log("error occured");

        context.bindings.outputTblStatus = [
          {
            PartitionKey: "Status",
            RowKey: "Send[0]",
            status: "Error Occurred",
            run_date: "07/02/2019"
          }
        ];

        return console.dir(error);
    }
    
    let lv_msg = "[" + body + "]" + smsMsg;
    context.log(lv_msg);

    context.bindings.outputTblStatus = [
      {
        PartitionKey: "Status",
        RowKey: "Send[0]",
        status: lv_msg,
        run_date: "07/02/2019"
      }
    ];
    context.outputTblStatus = [{
      PartitionKey: "Status",
      RowKey: "Send[0]",
      status: lv_msg,
      run_date: "07/02/2019"
    }];

    context.done();

  });
*/  
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

      smsRequest.post({
        "headers": { "content-type": "application/json", "Authorization": "Basic ZW1taXQua2FkYXlpZmNpOnNtc1Bhc3Mx", "Accept": "application/json" },
        "url": "http://api.messagenet.com.au/v2/message/simple_send",
        "body": JSON.stringify({
          "Message": smsMsg,
          "Recipient":"61433111696",
          "From":"Ausgrid Bot"    
        })
      }, (error, response, body) => {
        if(error) {
          context.log("error occured");
  
          context.bindings.outputTblStatus = [
            {
              PartitionKey: "Status",
              RowKey: "Send[0]",
              status: "Error Occurred",
              run_date: "07/02/2019"
            }
          ];
  
          return console.dir(error);
      }
        resolve(body);
        context.bindings.outputTblStatus = [
          {
            PartitionKey: "Status",
            RowKey: "Send[0]",
            status: "Success:" + body,
            run_date: "07/02/2019"
          }
        ];
      console.dir(JSON.parse(body));
      }); 
      console.log('Post PostCall');
    });
  }  
};