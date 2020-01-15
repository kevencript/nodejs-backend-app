/**
 * utilitarios/imageUpload.js
 *
 * @description: Middleware para realizar upload de fotos
 *
 */

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const config = require("../config/keys");

// Essa função deve ser passada como Middleware
exports.imageUpload = async (req, res, next) => {
  const { secretAccessKey, accessKeyId } = config.aws.s3;

  // Definições do Bucket
  const region = "us-west-2";
  const bucket = "dev-backbeauty";
  const acl = "public-read";

  try {
    aws.config.update({
      secretAccessKey,
      accessKeyId,
      region
    });

    const s3 = new aws.S3();

    // Verificando se a imagem é jpeg ou png
    const fileFilter = (req, file, cb) => {
      if (file.mimetype === "image/jpeg" || file.mimetype) {
        cb(null, true);
      } else {
        cb(new Error("Invalid Mime Type, only JPEG and PNG"), false);
      }
    };

    var limits = { fileSize: 1024 * 1024 * 1024 };

    const upload = multer({
      fileFilter,
      limits,
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

    const singleUpload = await upload.single("image");

    // Realizando upload de fato e obtendo a URL
    await singleUpload(req, res, err => {
      if (err || typeof req.file === "undefined")
        return res.status(400).json({
          errors: [
            {
              msg:
                "Erro ao realizar upload de imagem. Verifiquer o tamanho ou se o campo encontra-se preenchido",
              callback: err
            }
          ]
        });

      req.imageUrl = req.file.location;
      next();
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      errors: [{ msg: "Server Error", detail: err.message }]
    });
  }
};
