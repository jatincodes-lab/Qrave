using System.Data.Common;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace QRApp.Infrastructure.Data;

public sealed class NpgsqlConnectionFactory(IConfiguration configuration) : INpgsqlConnectionFactory
{
    private const string IndiaTimeZone = "Asia/Kolkata";

    public DbConnection CreateConnection()
    {
        var connectionString = configuration.GetConnectionString("Postgres");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("PostgreSQL connection string is not configured.");
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.Timezone))
        {
            builder.Timezone = IndiaTimeZone;
        }

        return new NpgsqlConnection(builder.ConnectionString);
    }
}
