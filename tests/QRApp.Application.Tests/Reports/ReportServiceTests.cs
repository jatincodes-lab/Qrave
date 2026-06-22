using QRApp.Application.Reports;

namespace QRApp.Application.Tests.Reports;

public sealed class ReportServiceTests
{
    [Fact]
    public async Task GetOrdersAsync_WhenDateToIsDateOnly_UsesExclusiveNextDay()
    {
        var repository = new FakeReportRepository();
        var service = new ReportService(repository);
        var tenantId = Guid.NewGuid();

        await service.GetOrdersAsync(
            tenantId,
            new OrderReportFilter(
                Guid.NewGuid(),
                new DateTime(2026, 6, 16),
                new DateTime(2026, 6, 22),
                " Cancelled ",
                " table 1 "),
            CancellationToken.None);

        Assert.NotNull(repository.LastFilter);
        Assert.Equal(new DateTime(2026, 6, 23), repository.LastFilter!.DateTo);
        Assert.Equal("Cancelled", repository.LastFilter.StatusCode);
        Assert.Equal("table 1", repository.LastFilter.Search);
    }

    [Fact]
    public async Task GetOrdersAsync_WhenDateToHasTime_PreservesExactDateTo()
    {
        var repository = new FakeReportRepository();
        var service = new ReportService(repository);
        var dateTo = new DateTime(2026, 6, 22, 14, 30, 0);

        await service.GetOrdersAsync(
            Guid.NewGuid(),
            new OrderReportFilter(null, null, dateTo, null, null),
            CancellationToken.None);

        Assert.NotNull(repository.LastFilter);
        Assert.Equal(dateTo, repository.LastFilter!.DateTo);
    }

    private sealed class FakeReportRepository : IReportRepository
    {
        public OrderReportFilter? LastFilter { get; private set; }

        public Task<OrderReportSummaryResponse> GetOrderSummaryAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
        {
            LastFilter = filter;
            return Task.FromResult(new OrderReportSummaryResponse(0, 0, 0, 0, 0, 0));
        }

        public Task<IReadOnlyCollection<OrderReportListItemResponse>> GetOrdersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
        {
            LastFilter = filter;
            return Task.FromResult<IReadOnlyCollection<OrderReportListItemResponse>>([]);
        }

        public Task<OrderReportDetailResponse> GetOrderDetailAsync(Guid tenantId, Guid orderId, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<IReadOnlyCollection<ItemReportResponse>> GetItemsAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
        {
            LastFilter = filter;
            return Task.FromResult<IReadOnlyCollection<ItemReportResponse>>([]);
        }

        public Task<IReadOnlyCollection<CustomerReportResponse>> GetCustomersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
        {
            LastFilter = filter;
            return Task.FromResult<IReadOnlyCollection<CustomerReportResponse>>([]);
        }
    }
}
