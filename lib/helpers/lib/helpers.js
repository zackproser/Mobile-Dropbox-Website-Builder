exports.isValidFile = function(file) {
    var valid = (file !== '.DS_Store') ? true : false;
    return valid;
}