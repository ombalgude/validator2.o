use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod certificate_verifier {
    use super::*;

    pub fn initialize_certificate(
        ctx: Context<InitializeCertificate>,
        certificate_id: String,
        student_name: String,
        institution_id: String,
        document_hash: String,
    ) -> Result<()> {
        let certificate = &mut ctx.accounts.certificate;
        certificate.certificate_id = certificate_id;
        certificate.student_name = student_name;
        certificate.institution_id = institution_id;
        certificate.document_hash = document_hash;
        certificate.verification_status = VerificationStatus::Pending;
        certificate.created_at = Clock::get()?.unix_timestamp;
        certificate.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn verify_certificate(
        ctx: Context<VerifyCertificate>,
        verification_result: VerificationResult,
    ) -> Result<()> {
        let certificate = &mut ctx.accounts.certificate;
        certificate.verification_status = verification_result.status;
        certificate.verification_results = Some(verification_result);
        certificate.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn revoke_certificate(ctx: Context<RevokeCertificate>) -> Result<()> {
        let certificate = &mut ctx.accounts.certificate;
        certificate.verification_status = VerificationStatus::Revoked;
        certificate.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(certificate_id: String)]
pub struct InitializeCertificate<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Certificate::INIT_SPACE,
        seeds = [b"certificate", certificate_id.as_bytes()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyCertificate<'info> {
    #[account(mut)]
    pub certificate: Account<'info, Certificate>,
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeCertificate<'info> {
    #[account(mut)]
    pub certificate: Account<'info, Certificate>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Certificate {
    pub certificate_id: String,        // 4 + 32
    pub student_name: String,          // 4 + 100
    pub institution_id: String,        // 4 + 32
    pub document_hash: String,         // 4 + 64
    pub verification_status: VerificationStatus,
    pub verification_results: Option<VerificationResult>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    Verified,
    Suspicious,
    Fake,
    Revoked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct VerificationResult {
    pub ocr_confidence: u8,
    pub tamper_score: u8,
    pub database_match: bool,
    pub anomaly_score: u8,
    pub verified_by: Pubkey,
    pub verified_at: i64,
}
