const checkCondition = (data, condition, dataCheck) => {
  switch (condition) {
    case ">":
      if (data > dataCheck) {
        return true;
      } else {
        return false;
      }
    case "<":
      if (data < dataCheck) {
        return true;
      } else {
        return false;
      }
    case "=":
      if (data === dataCheck) {
        return true;
      } else {
        return false;
      }
    default:
      return false;
  }
};

module.exports = {
  checkCondition
};
