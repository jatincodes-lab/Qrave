namespace QRApp.Infrastructure.Data;

internal static class StoredProcedures
{
    public const string TenantCreate = "public.tenant_create";
    public const string TenantGetById = "public.tenant_getbyid";
    public const string TenantAccessGetByTenantId = "public.tenantaccess_getbytenantid";
    public const string TenantAccessGetByQrToken = "public.tenantaccess_getbyqrtoken";
    public const string TenantSubscriptionGetByTenantId = "public.tenantsubscription_getbytenantid";
    public const string TenantSubscriptionUpdateManual = "public.tenantsubscription_updatemanual";

    public const string AuthRegisterTenantOwner = "public.auth_registertenantowner";
    public const string AuthGetUserByEmail = "public.auth_getuserbyemail";

    public const string BranchCreate = "public.branch_create";
    public const string BranchUpdate = "public.branch_update";
    public const string BranchGetById = "public.branch_getbyid";
    public const string BranchGetListByTenant = "public.branch_getlistbytenant";
    public const string BranchDeactivate = "public.branch_deactivate";

    public const string BranchOrderSettingsCreate = "public.branchordersettings_create";
    public const string BranchOrderSettingsUpdate = "public.branchordersettings_update";
    public const string BranchOrderSettingsGetByBranch = "public.branchordersettings_getbybranch";

    public const string MenuCategoryCreate = "public.menucategory_create";
    public const string MenuCategoryUpdate = "public.menucategory_update";
    public const string MenuCategoryGetListByBranch = "public.menucategory_getlistbybranch";
    public const string MenuCategoryDeactivate = "public.menucategory_deactivate";

    public const string MenuItemCreate = "public.menuitem_create";
    public const string MenuItemUpdate = "public.menuitem_update";
    public const string MenuItemGetListByBranch = "public.menuitem_getlistbybranch";
    public const string MenuItemDeactivate = "public.menuitem_deactivate";
    public const string PublicMenuGetByBranch = "public.publicmenu_getbybranch";

    public const string BranchOfferCreate = "public.branchoffer_create";
    public const string BranchOfferUpdate = "public.branchoffer_update";
    public const string BranchOfferGetListByBranch = "public.branchoffer_getlistbybranch";
    public const string BranchOfferDeactivate = "public.branchoffer_deactivate";
    public const string PublicOffersGetByQrToken = "public.publicoffers_getbyqrtoken";

    public const string BranchTableCreate = "public.branchtable_create";
    public const string BranchTableUpdate = "public.branchtable_update";
    public const string BranchTableGetListByBranch = "public.branchtable_getlistbybranch";
    public const string BranchTableDeactivate = "public.branchtable_deactivate";
    public const string BranchTableRegenerateQrToken = "public.branchtable_regenerateqrtoken";
    public const string QrVisitSessionCreate = "public.qrvisitsession_create";
    public const string PublicMenuGetByQrToken = "public.publicmenu_getbyqrtoken";

    public const string PublicOrderCreateFromQrToken = "public.publicorder_createfromqrtoken";
    public const string PublicOrderGetByQrToken = "public.publicorder_getbyqrtoken";
    public const string PublicOrderGetItemsByOrder = "public.publicorder_getitemsbyorder";
    public const string OrderFeedbackCreateFromQrToken = "public.orderfeedback_createfromqrtoken";
    public const string OrderFeedbackGetByQrToken = "public.orderfeedback_getbyqrtoken";
    public const string AdminFeedbackGetList = "public.adminfeedback_getlist";
    public const string PublicCustomerLookupByQrToken = "public.publiccustomer_lookupbyqrtoken";
    public const string PublicCustomerRecentOrdersByCustomer = "public.publiccustomer_recentordersbycustomer";
    public const string PublicCustomerRecentOrderItemsByCustomer = "public.publiccustomer_recentorderitemsbycustomer";
    public const string AdminOrderGetListByBranch = "public.adminorder_getlistbybranch";
    public const string AdminOrderGetItemsByBranch = "public.adminorder_getitemsbybranch";
    public const string AdminOrderUpdateStatus = "public.adminorder_updatestatus";
    public const string BranchBillingSettingsGetByBranch = "public.branchbillingsettings_getbybranch";
    public const string BranchBillingSettingsSave = "public.branchbillingsettings_save";
    public const string OrderBillGetByOrder = "public.orderbill_getbyorder";
    public const string OrderBillGenerate = "public.orderbill_generate";
    public const string OrderBillUpdatePaymentStatus = "public.orderbill_updatepaymentstatus";
    public const string OrderBillUpdateRefundStatus = "public.orderbill_updaterefundstatus";

    public const string ReportOrderSummary = "public.report_ordersummary";
    public const string ReportOrders = "public.report_orders";
    public const string ReportOrderDetail = "public.report_orderdetail";
    public const string ReportOrderItemsByOrder = "public.report_orderitemsbyorder";
    public const string ReportOrderHistoryByOrder = "public.report_orderhistorybyorder";
    public const string ReportItems = "public.report_items";
    public const string ReportCustomers = "public.report_customers";

    public const string WhatsAppCampaignPreviewRecipients = "public.whatsappcampaign_previewrecipients";
    public const string WhatsAppCampaignCreate = "public.whatsappcampaign_create";
    public const string WhatsAppCampaignGetList = "public.whatsappcampaign_getlist";

    public const string StaffUserCreate = "public.staffuser_create";
    public const string StaffUserGetList = "public.staffuser_getlist";
    public const string StaffUserUpdate = "public.staffuser_update";

    public const string WaiterCallCreateFromQrToken = "public.waitercall_createfromqrtoken";
    public const string WaiterCallGetListByBranch = "public.waitercall_getlistbybranch";
    public const string WaiterCallUpdateStatus = "public.waitercall_updatestatus";

    public const string AdminNotificationCreate = "public.adminnotification_create";
    public const string AdminNotificationGetList = "public.adminnotification_getlist";
    public const string AdminNotificationMarkRead = "public.adminnotification_markread";
    public const string AdminNotificationMarkAllRead = "public.adminnotification_markallread";
    public const string AdminSearch = "public.adminsearch";
}
