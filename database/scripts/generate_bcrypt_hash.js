// Script para generar hash bcrypt de una contraseña
// Uso: node generate_bcrypt_hash.js [contraseña]
const bcrypt = require('bcrypt');

const password = process.argv[2] || 'superadmin';

console.log(`Generando hash bcrypt para la contraseña: "${password}"`);
console.log('Espera, esto puede tomar unos segundos...\n');

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('Hash generado:');
    console.log(hash);
    console.log('\nCopia este hash y úsalo en el script SQL create_superadmin.sql');
  })
  .catch(err => {
    console.error('Error generando hash:', err);
    process.exit(1);
  });

