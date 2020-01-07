/**
 * utils/upload_de_foto.js
 *
 * @description: Esse arquivo contem a função de upload de imagem
 *
 */

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const config = require("../config/keys");

const { secretAccessKey, accessKeyId } = config.aws;

const region = "us-west-2";
const bucket = "dev-backbeauty";
const acl = "public-read";

aws.config.update({
  secretAccessKey,
  accessKeyId,
  region
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Invalid Mime Type, only JPEG and PNG"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    s3,
    bucket,
    acl,
    metadata: function(req, file, cb) {
      cb(null, { fieldName: `pic_${new Date().getTime()}.png` });
    },
    key: function(req, file, cb) {
      cb(null, Date.now().toString());
    }
  })
});

module.exports = upload;
