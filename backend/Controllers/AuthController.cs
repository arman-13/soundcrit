using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtService _jwt;
    private readonly EmailService _email;
    private readonly AppDbContext _db;

    public AuthController(UserManager<ApplicationUser> userManager, JwtService jwt, EmailService email, AppDbContext db)
    {
        _userManager = userManager;
        _jwt = jwt;
        _email = email;
        _db = db;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var user = new ApplicationUser
        {
            Email = req.Email,
            UserName = req.Username,
            DisplayName = req.DisplayName,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        var verifyToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        try { await _email.SendEmailVerificationAsync(user.Email!, user.DisplayName, verifyToken); }
        catch (Exception ex) { Console.WriteLine($"[Email] Verification send failed: {ex.Message}"); }

        return Ok(new AuthResponse(
            Token: _jwt.GenerateToken(user),
            User: ToDto(user)
        ));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Invalid email or password.");

        return Ok(new AuthResponse(
            Token: _jwt.GenerateToken(user),
            User: ToDto(user)
        ));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        return user is null ? NotFound() : Ok(ToDto(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user is null) return NotFound();

        user.DisplayName = req.DisplayName;
        user.Bio = req.Bio;
        user.AvatarUrl = req.AvatarUrl;

        await _userManager.UpdateAsync(user);
        return Ok(ToDto(user));
    }

    [HttpGet("/api/users/{name}")]
    public async Task<ActionResult<PublicUserDto>> GetPublicProfile(string name)
    {
        // Try username first, then display name. The fallback was a synchronous
        // FirstOrDefault on the DbSet, blocking a request thread on database I/O.
        var user = await _userManager.FindByNameAsync(name)
            ?? await _userManager.Users.FirstOrDefaultAsync(u => u.DisplayName.ToLower() == name.ToLower());
        if (user is null) return NotFound();
        return Ok(new PublicUserDto(user.Id, user.UserName!, user.DisplayName, user.AvatarUrl, user.Bio));
    }

    [HttpGet("/api/users/search")]
    public async Task<ActionResult<IEnumerable<PublicUserDto>>> SearchArtists([FromQuery] string q, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<PublicUserDto>());
        var query = q.ToLower();

        var artistIds = await _db.Tracks
            .Where(t => t.IsPublished && t.ArtistId != null)
            .Select(t => t.ArtistId!)
            .Distinct()
            .ToListAsync();

        var users = await _userManager.Users
            .Where(u => artistIds.Contains(u.Id) &&
                (u.UserName!.ToLower().Contains(query) || u.DisplayName.ToLower().Contains(query)))
            .Take(take)
            .ToListAsync();

        return Ok(users.Select(u => new PublicUserDto(u.Id, u.UserName!, u.DisplayName, u.AvatarUrl, u.Bio)));
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult> VerifyEmail(VerifyEmailRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user is null) return BadRequest("Invalid request.");
        var result = await _userManager.ConfirmEmailAsync(user, req.Token);
        if (!result.Succeeded) return BadRequest("Invalid or expired verification link.");
        return Ok();
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword(ForgotPasswordRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        // Always return OK to avoid leaking which emails are registered
        if (user is not null)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            try { await _email.SendPasswordResetAsync(user.Email!, user.DisplayName, token); }
            catch (Exception ex) { Console.WriteLine($"[Email] Password reset send failed: {ex.Message}"); }
        }
        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword(ResetPasswordRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user is null) return BadRequest("Invalid request.");
        var result = await _userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);
        if (!result.Succeeded) return BadRequest("Invalid or expired reset link.");
        return Ok();
    }

    private static UserDto ToDto(ApplicationUser u) => new(
        Id: u.Id,
        Email: u.Email!,
        Username: u.UserName!,
        DisplayName: u.DisplayName,
        AvatarUrl: u.AvatarUrl,
        Bio: u.Bio,
        CreatedAt: u.CreatedAt
    );
}
