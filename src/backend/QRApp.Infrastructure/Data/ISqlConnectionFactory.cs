using System.Data.Common;

namespace QRApp.Infrastructure.Data;

public interface INpgsqlConnectionFactory
{
    DbConnection CreateConnection();
}

