import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CertificateVerifier } from "../target/types/certificate_verifier";
import { expect } from "chai";

describe("certificate-verifier", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CertificateVerifier as Program<CertificateVerifier>;
  const provider = anchor.getProvider();

  it("Initializes a certificate", async () => {
    const certificateId = "CERT_123456";
    const studentName = "John Doe";
    const institutionId = "INST_001";
    const documentHash = "abc123def456";

    const [certificatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), Buffer.from(certificateId)],
      program.programId
    );

    await program.methods
      .initializeCertificate(
        certificateId,
        studentName,
        institutionId,
        documentHash
      )
      .accounts({
        certificate: certificatePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const certificate = await program.account.certificate.fetch(certificatePda);
    expect(certificate.certificateId).to.equal(certificateId);
    expect(certificate.studentName).to.equal(studentName);
    expect(certificate.verificationStatus.pending).to.be.true;
  });

  it("Verifies a certificate", async () => {
    const certificateId = "CERT_123456";
    const [certificatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), Buffer.from(certificateId)],
      program.programId
    );

    const verificationResult = {
      ocrConfidence: 95,
      tamperScore: 5,
      databaseMatch: true,
      anomalyScore: 10,
      verifiedBy: provider.wallet.publicKey,
      verifiedAt: Date.now() / 1000,
    };

    await program.methods
      .verifyCertificate(verificationResult)
      .accounts({
        certificate: certificatePda,
        verifier: provider.wallet.publicKey,
      })
      .rpc();

    const certificate = await program.account.certificate.fetch(certificatePda);
    expect(certificate.verificationStatus.verified).to.be.true;
    expect(certificate.verificationResults).to.not.be.null;
  });

  it("Revokes a certificate", async () => {
    const certificateId = "CERT_123456";
    const [certificatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), Buffer.from(certificateId)],
      program.programId
    );

    await program.methods
      .revokeCertificate()
      .accounts({
        certificate: certificatePda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const certificate = await program.account.certificate.fetch(certificatePda);
    expect(certificate.verificationStatus.revoked).to.be.true;
  });
});
