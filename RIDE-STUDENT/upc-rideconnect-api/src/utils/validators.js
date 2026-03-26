function isUpcEmail(email) {
  return email && email.toLowerCase().endsWith('@upc.ac.cd');
}

function isValidStudentCard(card) {
  return card && /^UPC-\d{4}-\d{4}$/i.test(card);
}

module.exports = { isUpcEmail, isValidStudentCard };
