module.exports = async function (context, req) {
    /* Steps:
       1 - Call a rest API to Cliq to get the data - timed ~11pm or 5am (ie enought time to send a msg and notify a user to charge the key)
       2 - Store data in a local database - key date
       3 - Filter data to identify users with 1 day expiry (possibly add to queue for processing)
       4 - Call Messagenet API to send sms's
       5 - Keep logs of all messages for audit purposes
       6 - Send Admin group a status message (ie no sms sent + email of users/or nightly API call was not successful)
    */
    context.log('JavaScript HTTP trigger function processed a request.');

    var request = require("request"); 
    var lv_body="init";
    try {
        console.log('Pre work');
        const html = await callCliqWS('https://microsoft.com')
        console.log('SHOULD WORK:');
        console.log(html);

        
        // try downloading an invalid url
        const lv_body = await callCliqWSPost("http://test.com")
        context.res = {
            // status: 200, 
            body: "HTML:" + html + lv_body
        };
        context.bindings.outputQueueItem = "HTML:" ; 
/*        context.outputQueueItem = {

        };*/
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
        context.res = {
            status: 400,
            body: "Something bad happened!!"
        };        
    }
    context.log('Post Call.');



// wrap a request in an promise
  function callCliqWS(url) {  
    return new Promise((resolve, reject) => {


        request(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
  }


  function callCliqWSPost(url) {  
    return new Promise((resolve, reject) => {
      console.log('Pre PostCall');
      request.post({
        "headers": { "content-type": "application/json" },
        "url": "http://httpbin.org/post", // <-- Update url
        "body": JSON.stringify({
            "firstname": "Nic",
            "lastname": "Raboy"
        }) 
      }, (error, response, body) => {
        if(error) {
            return console.dir(error);
        }
        resolve(body);
        console.dir(JSON.parse(body));
      }); 
      console.log('Post PostCall');
    });
  }
};
