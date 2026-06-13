using Npgsql;
using NpgsqlTypes;

namespace QRApp.Infrastructure.Data;

internal static class NpgsqlCommandExtensions
{
    public static void AddGuid(this NpgsqlCommand command, string name, Guid value)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Uuid).Value = value;
    }

    public static void AddNullableGuid(this NpgsqlCommand command, string name, Guid? value)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Uuid).Value = value.HasValue ? value.Value : DBNull.Value;
    }

    public static void AddDateTime(this NpgsqlCommand command, string name, DateTime? value)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.TimestampTz).Value = value.HasValue ? AppTime.ToPostgresTimestamp(value.Value) : DBNull.Value;
    }

    public static void AddString(this NpgsqlCommand command, string name, string? value, int length)
    {
        var parameter = command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Text);
        parameter.Value = value is null ? DBNull.Value : value;
    }

    public static void AddChar(this NpgsqlCommand command, string name, string value, int length)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Char).Value = value;
    }

    public static void AddBool(this NpgsqlCommand command, string name, bool value)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Boolean).Value = value;
    }

    public static void AddInt(this NpgsqlCommand command, string name, int value)
    {
        command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Integer).Value = value;
    }

    public static void AddDecimal(this NpgsqlCommand command, string name, decimal value, byte precision, byte scale)
    {
        var parameter = command.Parameters.Add(ToPostgresParameterName(name), NpgsqlDbType.Numeric);
        parameter.Precision = precision;
        parameter.Scale = scale;
        parameter.Value = value;
    }

    internal static string ToPostgresParameterName(string name)
    {
        var trimmed = name.TrimStart('@', ':');
        return trimmed.StartsWith("p_", StringComparison.OrdinalIgnoreCase)
            ? trimmed.ToLowerInvariant()
            : $"p_{trimmed.ToLowerInvariant()}";
    }
}
