const request = require("request");
const config = require("../config/keys");

exports.enviarSms = async (telefone, message) => {
  let url = "https://mex10.com/api/shortcode.aspx?t=send&";

  let userStr = "u=" + config.mex10.user + "&";
  let passwordStr = "p=" + config.mex10.password + "&";
  let telefoneStr = "n=" + telefone + "&";
  let messageStr = "m=" + message + "&";
  let tokenStr =
    "token=6c1b6425586764968888cffb0190d145c6982f4ab87e14ffaac0f0f76c5e457e";

  // Concatenando String
  url = url + userStr + passwordStr + telefoneStr + messageStr + tokenStr;

  var options = {
    method: "GET",
    url,
    headers: {}
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });
};
