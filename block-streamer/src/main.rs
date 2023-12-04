use tracing_subscriber::prelude::*;

mod block_stream;
mod delta_lake_client;
mod indexer_config;
mod redis;
mod rules;
mod s3_client;
mod server;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting Block Streamer Service...");

    let redis_connection_manager = redis::connect("redis://127.0.0.1").await?;

    let aws_config = aws_config::from_env().load().await;
    let s3_client = crate::s3_client::S3Client::new(&aws_config);

    let delta_lake_client =
        std::sync::Arc::new(crate::delta_lake_client::DeltaLakeClient::new(s3_client));

    server::init(redis_connection_manager, delta_lake_client).await?;

    Ok(())
}
