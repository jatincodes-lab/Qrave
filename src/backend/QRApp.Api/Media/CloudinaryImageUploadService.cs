using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace QRApp.Api.Media;

public sealed class CloudinaryImageUploadService(HttpClient httpClient, IOptions<CloudinaryOptions> options) : IImageUploadService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly CloudinaryOptions options = options.Value;

    public async Task<MediaUploadResult> UploadAsync(IFormFile file, string purpose, CancellationToken cancellationToken)
    {
        var cloudName = options.CloudName.Trim();
        var apiKey = options.ApiKey.Trim();
        var apiSecret = options.ApiSecret.Trim();

        if (string.IsNullOrWhiteSpace(cloudName) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret))
        {
            return new MediaUploadResult(false, null, null, "Cloudinary is not configured.");
        }

        if (file.Length <= 0)
        {
            return new MediaUploadResult(false, null, null, "Please choose an image to upload.");
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return new MediaUploadResult(false, null, null, "Image size must be 5 MB or less.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return new MediaUploadResult(false, null, null, "Only JPG, PNG, or WebP images are supported.");
        }

        var folder = $"{options.UploadFolder.Trim().Trim('/')}/{CleanPurpose(purpose)}";
        var uploadPreset = options.UploadPreset.Trim();

        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signedParameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["folder"] = folder,
            ["timestamp"] = timestamp
        };

        if (!string.IsNullOrWhiteSpace(uploadPreset))
        {
            signedParameters["upload_preset"] = uploadPreset;
        }

        var signature = CreateSignature(signedParameters, apiSecret);

        using var content = new MultipartFormDataContent();
        AddFormField(content, "folder", folder);
        AddFormField(content, "timestamp", timestamp);
        AddFormField(content, "api_key", apiKey);
        AddFormField(content, "signature", signature);

        if (!string.IsNullOrWhiteSpace(uploadPreset))
        {
            AddFormField(content, "upload_preset", uploadPreset);
        }

        AddFile(content, fileContent, "file", file.FileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.cloudinary.com/v1_1/{cloudName}/image/upload")
        {
            Content = content
        };

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new MediaUploadResult(false, null, null, ReadCloudinaryError(responseBody) ?? "Image upload failed.");
        }

        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;
        var url = root.TryGetProperty("secure_url", out var secureUrl) ? secureUrl.GetString() : null;
        var publicId = root.TryGetProperty("public_id", out var publicIdValue) ? publicIdValue.GetString() : null;

        return string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(publicId)
            ? new MediaUploadResult(false, null, null, "Image upload response was invalid.")
            : new MediaUploadResult(true, url, publicId, null);
    }

    private static string? ReadCloudinaryError(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                return message.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static string CreateSignature(SortedDictionary<string, string> parameters, string apiSecret)
    {
        var payload = string.Join("&", parameters.Select(parameter => $"{parameter.Key}={parameter.Value}")) + apiSecret;
        var hash = SHA1.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static void AddFormField(MultipartFormDataContent content, string name, string value)
    {
        var field = new StringContent(value, Encoding.UTF8);
        field.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = Quote(name)
        };
        content.Add(field);
    }

    private static void AddFile(MultipartFormDataContent content, HttpContent fileContent, string name, string fileName)
    {
        fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = Quote(name),
            FileName = Quote(fileName)
        };
        content.Add(fileContent);
    }

    private static string Quote(string value) => $"\"{value.Replace("\"", "\\\"")}\"";

    private static string CleanPurpose(string purpose)
    {
        var value = string.IsNullOrWhiteSpace(purpose) ? "general" : purpose.Trim().ToLowerInvariant();
        return value switch
        {
            "menu-item" => "menu-items",
            "branch-logo" => "branch-logos",
            "offer" => "offers",
            _ => "general"
        };
    }
}
