using QRApp.Application.Customers;

namespace QRApp.Application.Tests.Customers;

public sealed class CustomerServiceTests
{
    [Fact]
    public async Task CreateDeviceAccessAsync_WhenCustomerExists_IssuesRandomTokenAndStoresOnlyHash()
    {
        var repository = new FakeCustomerRepository { CreateResult = true };
        var service = new CustomerService(repository);

        var result = await service.CreateDeviceAccessAsync(
            " demo-table-1 ",
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(43, result.Value.Token.Length);
        Assert.Equal("demo-table-1", repository.QrToken);
        Assert.Equal(Guid.Parse("11111111-1111-1111-1111-111111111111"), repository.OrderId);
        Assert.Equal(64, repository.TokenHash?.Length);
        Assert.DoesNotContain(result.Value.Token, repository.TokenHash!, StringComparison.Ordinal);
        Assert.True(result.Value.ExpiresAtUtc > DateTime.UtcNow.AddDays(89));
    }

    [Fact]
    public async Task GetByDeviceAccessAsync_WhenTokenIsValid_HashesTokenBeforeRepositoryLookup()
    {
        var repository = new FakeCustomerRepository { Customer = NewCustomer() };
        var service = new CustomerService(repository);
        const string token = "abcdefghijklmnopqrstuvwxyzABCDEFGH123456789";

        var result = await service.GetByDeviceAccessAsync("demo-table-1", token, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Same(repository.Customer, result.Value);
        Assert.Equal(64, repository.TokenHash?.Length);
        Assert.NotEqual(token, repository.TokenHash);
    }

    [Fact]
    public async Task GetByDeviceAccessAsync_WhenTokenLengthIsInvalid_ReturnsValidationError()
    {
        var repository = new FakeCustomerRepository();
        var service = new CustomerService(repository);

        var result = await service.GetByDeviceAccessAsync("demo-table-1", "short", CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == "deviceToken");
        Assert.Null(repository.TokenHash);
    }

    private static PublicCustomerLookupResponse NewCustomer()
    {
        return new PublicCustomerLookupResponse(
            Guid.NewGuid(),
            "Priya",
            "9876543210",
            false,
            2,
            2,
            350m,
            DateTime.UtcNow,
            []);
    }

    private sealed class FakeCustomerRepository : ICustomerRepository
    {
        public bool CreateResult { get; init; }
        public PublicCustomerLookupResponse? Customer { get; init; }
        public string? QrToken { get; private set; }
        public Guid? OrderId { get; private set; }
        public string? TokenHash { get; private set; }

        public Task<bool> CreateDeviceAccessAsync(
            string qrToken,
            Guid orderId,
            string tokenHash,
            DateTime expiresAtUtc,
            CancellationToken cancellationToken)
        {
            QrToken = qrToken;
            OrderId = orderId;
            TokenHash = tokenHash;
            return Task.FromResult(CreateResult);
        }

        public Task<PublicCustomerLookupResponse?> GetByDeviceAccessAsync(
            string qrToken,
            string tokenHash,
            CancellationToken cancellationToken)
        {
            QrToken = qrToken;
            TokenHash = tokenHash;
            return Task.FromResult(Customer);
        }
    }
}
