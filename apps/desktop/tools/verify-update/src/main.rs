use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
use std::{env, fs, process};

fn verify() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    let artifact = args.next().ok_or("missing artifact")?;
    let signature_path = args.next().ok_or("missing signature")?;
    let expected_version = args.next().ok_or("missing version")?;
    if args.next().is_some() {
        return Err("unexpected argument".into());
    }
    let key = String::from_utf8(STANDARD.decode(env::var("COSPACE_UPDATER_PUBLIC_KEY")?.trim())?)?;
    let signature =
        String::from_utf8(STANDARD.decode(fs::read_to_string(signature_path)?.trim())?)?;
    let key = PublicKey::decode(&key)?;
    let signature = Signature::decode(&signature)?;
    key.verify(&fs::read(artifact)?, &signature, true)?;
    let signed_version = signature
        .trusted_comment()
        .split('\t')
        .find_map(|part| part.strip_prefix("version:"));
    if signed_version != Some(expected_version.as_str()) {
        return Err("signature version does not match release".into());
    }
    Ok(())
}

fn main() {
    if let Err(error) = verify() {
        eprintln!("Update signature verification failed: {error}");
        process::exit(1);
    }
}
