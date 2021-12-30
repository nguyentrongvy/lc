exports.specialRegex = text => {
    return new RegExp(text.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"), 'i');
};