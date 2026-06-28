/**
 * generate-ca.js — Platform Root CA ve Sunucu Sertifikası Üretim Betiği
 *
 * Bu betik bir kere çalıştırılır ve platformun "Pasaport Basım Makinesini" kurar.
 * Üretilen dosyalar:
 *   - certs/ca-key.pem      → CA Private Key (gizli, sadece sunucuda)
 *   - certs/ca-cert.pem     → CA Sertifikası (cihazlara dağıtılır)
 *   - certs/server-key.pem  → Sunucu Private Key
 *   - certs/server-cert.pem → Sunucu Sertifikası (TLS için)
 *
 * Kullanım:
 *   node scripts/generate-ca.js
 */

const forge = require("node-forge");
const fs = require("fs");
const path = require("path");

const pki = forge.pki;
const CERTS_DIR = path.join(__dirname, "..", "certs");

// Klasörü oluştur
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

console.log("🔐 Root CA üretiliyor...\n");

// ================================================================
// 1. ROOT CA (Sertifika Otoritesi) Üretimi
// ================================================================
const caKeys = pki.rsa.generateKeyPair(4096);
const caCert = pki.createCertificate();

caCert.publicKey = caKeys.publicKey;
caCert.serialNumber = "01";
caCert.validity.notBefore = new Date();
caCert.validity.notAfter = new Date();
caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10); // 10 yıl

const caAttrs = [
  { name: "commonName", value: "AlmiraThings Root CA" },
  { name: "organizationName", value: "AlmiraThings" },
  { name: "countryName", value: "TR" },
];
caCert.setSubject(caAttrs);
caCert.setIssuer(caAttrs); // Self-signed: kendi kendini imzalar

caCert.setExtensions([
  { name: "basicConstraints", cA: true, critical: true },
  { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true },
  {
    name: "subjectKeyIdentifier",
  },
]);

// CA kendi kendini imzalar (Self-Signed)
caCert.sign(caKeys.privateKey, forge.md.sha256.create());

// Dosyalara yaz
fs.writeFileSync(
  path.join(CERTS_DIR, "ca-key.pem"),
  pki.privateKeyToPem(caKeys.privateKey)
);

fs.writeFileSync(
  path.join(CERTS_DIR, "ca-cert.pem"),
  pki.certificateToPem(caCert)
);

console.log("✅ Root CA üretildi:");
console.log("📄 certs/ca-cert.pem (Public - cihazlara dağıtılır)");
console.log("🔑 certs/ca-key.pem  (Private - GİZLİ tutulmalı!)\n");

// ================================================================
// 2. SUNUCU SERTİFİKASI Üretimi
// ================================================================
const serverKeys = pki.rsa.generateKeyPair(2048);
const serverCert = pki.createCertificate();

serverCert.publicKey = serverKeys.publicKey;
serverCert.serialNumber = "02";
serverCert.validity.notBefore = new Date();
serverCert.validity.notAfter = new Date();
serverCert.validity.notAfter.setFullYear(serverCert.validity.notBefore.getFullYear() + 5); // 5 yıl

const serverAttrs = [
  { name: "commonName", value: "localhost" },
  { name: "organizationName", value: "AlmiraThings" },
  { name: "countryName", value: "TR" },
];
serverCert.setSubject(serverAttrs);
serverCert.setIssuer(caAttrs); // CA tarafından imzalanacak

serverCert.setExtensions([
  { name: "basicConstraints", cA: false },
  {
    name: "keyUsage",
    digitalSignature: true,
    keyEncipherment: true,
    critical: true,
  },
  { name: "extKeyUsage", serverAuth: true },
  {
    name: "subjectAltName",
    altNames: [
      { type: 2, value: "localhost" },      // DNS
      { type: 7, ip: "127.0.0.1" },         // IP
      { type: 7, ip: "10.16.107.166" },     // Local Network IP
    ],
  },
]);

// CA'nın private key'i ile imzala
serverCert.sign(caKeys.privateKey, forge.md.sha256.create());

// Dosyalara yaz
fs.writeFileSync(
  path.join(CERTS_DIR, "server-key.pem"),
  pki.privateKeyToPem(serverKeys.privateKey)
);
fs.writeFileSync(
  path.join(CERTS_DIR, "server-cert.pem"),
  pki.certificateToPem(serverCert)
);

console.log("✅ Sunucu Sertifikası üretildi:");
console.log("   📄 certs/server-cert.pem (Sunucu kimliği)");
console.log("   🔑 certs/server-key.pem  (Sunucu private key)\n");

// ================================================================
// 3. DOĞRULAMA
// ================================================================
const caStore = pki.createCaStore([caCert]);
try {
  pki.verifyCertificateChain(caStore, [serverCert]);
  console.log("🔒 Doğrulama başarılı: Sunucu sertifikası CA tarafından imzalanmış. ✅");
} catch (err) {
  console.error("❌ Doğrulama başarısız:", err.message);
}

console.log("\n📌 Sonraki adım: 'npm run dev' ile sunucuyu başlatın.");
console.log("   TLS portu (8883) otomatik olarak bu sertifikaları kullanacak.\n");
