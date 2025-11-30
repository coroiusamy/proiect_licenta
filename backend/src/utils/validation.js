// Verifică dacă email-ul are format corect
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Verifică parola
export const isStrongPassword = (password) => {
  // Regex: Cel puțin 8 caractere, o majusculă, o minusculă, un număr
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
