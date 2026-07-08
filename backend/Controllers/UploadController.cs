using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly Cloudinary _cloudinary;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public UploadController(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = "music/covers",
        };

        var result = await _cloudinary.UploadAsync(uploadParams);

        if (result.Error != null)
            return StatusCode(500, result.Error.Message);

        return Ok(new { url = result.SecureUrl.ToString() });
    }

    [HttpPost("audio")]
    public async Task<IActionResult> UploadAudio(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var supabaseUrl = _config["Supabase:Url"];
        var supabaseKey = _config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return StatusCode(500, "Supabase storage is not configured.");

        // Read file bytes and get duration via TagLib
        using var memStream = new MemoryStream();
        await file.CopyToAsync(memStream);
        var bytes = memStream.ToArray();

        string duration;
        try
        {
            var tagStream = new MemoryStream(bytes);
            var abstraction = new AudioStreamAbstraction(file.FileName, tagStream);
            var tagFile = TagLib.File.Create(abstraction);
            var totalSeconds = (int)tagFile.Properties.Duration.TotalSeconds;
            duration = $"{totalSeconds / 60}:{(totalSeconds % 60):D2}";
        }
        catch
        {
            duration = "0:00";
        }

        // Upload to Supabase Storage
        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var client = _httpClientFactory.CreateClient();
        using var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
        client.DefaultRequestHeaders.Add("apikey", supabaseKey);

        var response = await client.PostAsync($"{supabaseUrl}/storage/v1/object/audio/{fileName}", content);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return StatusCode(500, $"Supabase upload failed: {error}");
        }

        var publicUrl = $"{supabaseUrl}/storage/v1/object/public/audio/{fileName}";
        return Ok(new { url = publicUrl, duration });
    }
}

file class AudioStreamAbstraction(string name, Stream stream) : TagLib.File.IFileAbstraction
{
    public string Name { get; } = name;
    public Stream ReadStream { get; } = stream;
    public Stream WriteStream { get; } = stream;
    public void CloseStream(Stream s) { }
}
