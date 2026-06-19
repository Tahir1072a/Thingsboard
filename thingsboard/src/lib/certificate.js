/**
 * certificate.js — Cihaz Sertifikası Üretim ve Doğrulama Yardımcıları
 *
 * Root CA anahtarlarını kullanarak her cihaz için benzersiz
 * Private Key + Sertifika çifti üretir.
 *
 * Üretilen sertifikanın SHA-256 parmak izi (fingerprint) veritabanında saklanır.
 * Cihaz bağlanırken sunucu bu parmak iziyle cihazı tanır.
 */

import forge from "node-forge";
import fs from "fs";
import path from "path";

const pki = forge.pki;

// ------------------------------------------------------------------ //
// CA Anahtarlarını Yükle (Sunucu başlatılırken bir kez okunur)
// ------------------------------------------------------------------ //
const CERTS_DIR = path.join(process.cwd(), "certs");

let caKey = null;
let caCert = null;
let caCertPem = null;

function loadCA() {
  if (caCert && caKey) return; // Zaten yüklü

  const caKeyPath = path.join(CERTS_DIR, "ca-key.pem");
  const caCertPath = path.join(CERTS_DIR, "ca-cert.pem");

  if (!fs.existsSync(caKeyPath) || !fs.existsSync(caCertPath)) {
    throw new Error(
      "CA dosyaları bulunamadı! Önce 'node scripts/generate-ca.js' çalıştırın."
    );
  }

  const caKeyPem = fs.readFileSync(caKeyPath, "utf-8");
  caCertPem = fs.readFileSync(caCertPath, "utf-8");

  caKey = pki.privateKeyFromPem(caKeyPem);
  caCert = pki.certificateFromPem(caCertPem);
}

// ------------------------------------------------------------------ //
// Cihaz Sertifikası Üretimi
// ------------------------------------------------------------------ //

/**
 * Belirtilen cihaz için Private Key + Sertifika üretir.
 *
 * @param {string} deviceId - Cihazın MongoDB _id'si (sertifikadaki CN olur)
 * @param {string} deviceName - Cihazın okunabilir adı (sertifikaya eklenir)
 * @returns {{ deviceKeyPem, deviceCertPem, caCertPem, fingerprint }}
 */
export function generateDeviceCertificate(deviceId, deviceName) {
  loadCA();

  // 1. Cihaz için anahtar çifti üret (2048 bit)
  const deviceKeys = pki.rsa.generateKeyPair(2048);

  // 2. Sertifika oluştur
  const cert = pki.createCertificate();
  cert.publicKey = deviceKeys.publicKey;
  cert.serialNumber = Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

  // Cihaz kimlik bilgileri
  const deviceAttrs = [
    { name: "commonName", value: deviceId },
    { name: "organizationName", value: "AlmiraThings" },
  ];
  cert.setSubject(deviceAttrs);
  cert.setIssuer(caCert.subject.attributes); // CA tarafından imzalandığını belirt

  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true,
      critical: true,
    },
    { name: "extKeyUsage", clientAuth: true }, // Bu bir istemci (client) sertifikasıdır
  ]);

  // 3. CA'nın private key'i ile imzala (Pasaport mührü)
  cert.sign(caKey, forge.md.sha256.create());

  // 4. PEM formatına çevir
  const deviceKeyPem = pki.privateKeyToPem(deviceKeys.privateKey);
  const deviceCertPem = pki.certificateToPem(cert);

  // 5. Parmak izi (Fingerprint) hesapla — SHA-256
  const fingerprint = calculateFingerprint(cert);

  return {
    deviceKeyPem,   // Cihazın Private Key'i (ZIP'e konacak)
    deviceCertPem,  // Cihazın Sertifikası (ZIP'e konacak)
    caCertPem,      // CA Sertifikası (ZIP'e konacak)
    fingerprint,    // Veritabanında saklanacak (doğrulama için)
  };
}

// ------------------------------------------------------------------ //
// Parmak İzi Hesaplama
// ------------------------------------------------------------------ //

/**
 * Bir sertifikanın SHA-256 parmak izini hesaplar.
 * Bağlantı anında cihazın sertifikasından parmak izi çıkarılır
 * ve veritabanındaki kayıtla karşılaştırılır.
 *
 * @param {forge.pki.Certificate} cert - node-forge sertifika objesi
 * @returns {string} SHA-256 hex fingerprint
 */
export function calculateFingerprint(cert) {
  // 1. Sertifikayı soyut sözdizimi ağacına (ASN.1 formatına) dönüştür
  const certificateAsn1Object = pki.certificateToAsn1(cert);
  
  // 2. ASN.1 formatını standart ikili (binary) DER formatına çevir
  const binaryDerFormat = forge.asn1.toDer(certificateAsn1Object).getBytes();
  
  // 3. SHA-256 şifreleme/özetleme (hashing) algoritmasını başlat
  const sha256Hasher = forge.md.sha256.create();
  
  // 4. İkili veriyi özetleyiciye ver
  sha256Hasher.update(binaryDerFormat);
  
  // 5. Özeti Hexadecimal (16'lık sayı sistemi) bir metne dönüştür
  const fingerprintHex = sha256Hasher.digest().toHex();
  
  return fingerprintHex;
}

/**
 * PEM formatındaki sertifika metninden parmak izi hesaplar.
 * (Bağlantı anında TLS'den gelen PEM ile kullanılır)
 *
 * @param {string} pemString - PEM formatında sertifika
 * @returns {string} SHA-256 hex fingerprint
 */
export function fingerprintFromPem(pemString) {
  const cert = pki.certificateFromPem(pemString);
  return calculateFingerprint(cert);
}

/**
 * Bir PEM sertifikasının bu platform CA'sı tarafından
 * imzalanıp imzalanmadığını doğrular.
 *
 * @param {string} pemString - Doğrulanacak sertifika (PEM)
 * @returns {boolean}
 */
export function verifyCertificate(pemString) {
  loadCA();
  try {
    const cert = pki.certificateFromPem(pemString);
    const caStore = pki.createCaStore([caCert]);
    pki.verifyCertificateChain(caStore, [cert]);
    return true;
  } catch {
    return false;
  }
}
