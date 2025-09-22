# Security Policy

## 🔒 Security Commitment

The Focus Space extension team takes security seriously. We appreciate your efforts to responsibly disclose security vulnerabilities and will work to address them promptly.

## 🛡️ Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | ✅ Current development |
| < 0.0.1 | ❌ Not supported   |

*Note: As this is an early-stage project, we currently support only the latest development version. Once we reach stable release (1.0.0), we will maintain security support for the current major version and the previous major version.*

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in Focus Space, please report it responsibly:

### ✅ DO Report These Issues

- **Code Execution**: Ability to execute arbitrary code through the extension
- **Data Exfiltration**: Unauthorized access to workspace files or VS Code data
- **Privilege Escalation**: Gaining elevated permissions beyond the extension's scope
- **Malicious File Handling**: Issues with processing untrusted file content
- **Configuration Injection**: Ability to modify VS Code settings maliciously
- **Path Traversal**: Accessing files outside the intended workspace
- **Command Injection**: Executing unintended system commands

### 📧 How to Report

**Primary Contact**: [cristian@ormasoft.cl](mailto:cristian@ormasoft.cl)

**Please include in your report:**

1. **Summary**: Brief description of the vulnerability
2. **Impact**: Potential security implications
3. **Steps to Reproduce**: Detailed reproduction steps
4. **Environment**: 
   - VS Code version
   - Focus Space extension version
   - Operating system
   - Node.js version (if relevant)
5. **Proof of Concept**: Code or screenshots demonstrating the issue
6. **Suggested Fix**: If you have ideas for remediation

### 🔐 Security Report Template

```
Subject: [SECURITY] Focus Space Vulnerability Report

**Vulnerability Summary:**
Brief description of the security issue

**Impact Assessment:**
- Severity: [Critical/High/Medium/Low]
- Attack Vector: [Local/Remote/Physical]
- Prerequisites: What access is needed to exploit this

**Technical Details:**
- Affected Component: 
- Vulnerability Type: 
- CVE ID (if applicable):

**Reproduction Steps:**
1. Step one
2. Step two
3. Result

**Environment:**
- VS Code Version: 
- Focus Space Version: 
- OS: 
- Additional context:

**Proof of Concept:**
[Code, screenshots, or detailed explanation]

**Suggested Remediation:**
[Your recommendations for fixing the issue]
```

## ⏱️ Response Timeline

We are committed to responding to security reports promptly:

| Timeframe | Action |
|-----------|---------|
| **24 hours** | Initial acknowledgment of your report |
| **72 hours** | Preliminary assessment and severity classification |
| **7 days** | Detailed analysis and planned fix timeline |
| **30 days** | Target resolution for most issues |

*Complex issues may require additional time. We will keep you informed of progress.*

## 🔒 Security Measures

### Current Security Practices

- **Input Validation**: All user inputs and file paths are validated
- **Sandboxed Execution**: Extension runs within VS Code's security model
- **Minimal Permissions**: Request only necessary VS Code API permissions
- **Secure File Handling**: Safe processing of workspace files and configurations
- **Configuration Validation**: Strict validation of all configuration options
- **Error Handling**: Secure error messages that don't leak sensitive information

### Development Security

- **Code Review**: All changes require review before merging
- **Dependency Scanning**: Regular updates and security scanning of dependencies
- **Type Safety**: TypeScript for compile-time security checks
- **Testing**: Comprehensive tests including security edge cases
- **Static Analysis**: ESLint rules for security best practices

## 🚫 Out of Scope

The following are generally **not** considered security vulnerabilities:

- **VS Code Core Issues**: Problems with VS Code itself (report to Microsoft)
- **User Misconfiguration**: Issues resulting from user configuration errors
- **Third-party Dependencies**: Vulnerabilities in VS Code or Node.js (unless we can mitigate)
- **Social Engineering**: Issues requiring user to be tricked into taking action
- **Physical Access**: Issues requiring physical access to the machine
- **Denial of Service**: Performance issues or resource consumption
- **Information Disclosure**: Display of non-sensitive workspace information

## 🏆 Recognition

We believe in recognizing security researchers who help improve Focus Space:

### Hall of Fame
*Contributors who responsibly disclose security vulnerabilities will be listed here (with permission)*

### Recognition Process
- **Public Thanks**: Recognition in release notes and security advisories
- **Hall of Fame**: Listing in this document (optional)
- **Early Access**: Preview access to new features (when applicable)

*Note: As an open-source project, we cannot offer monetary rewards, but we deeply appreciate responsible disclosure.*

## 📋 Security Advisories

When security vulnerabilities are fixed, we will:

1. **Release Security Update**: Patch the vulnerability in the next release
2. **Publish Advisory**: Create a GitHub Security Advisory with details
3. **Update Documentation**: Add to this security policy if needed
4. **Notify Users**: Through release notes and extension marketplace

## 🔍 Security Considerations for Users

### Best Practices

- **Keep Updated**: Always use the latest version of Focus Space
- **Workspace Trust**: Only open trusted workspaces in VS Code
- **File Permissions**: Be cautious with files from untrusted sources
- **Configuration**: Review extension settings for your security needs

### Configuration Security

- **Exclude Patterns**: Use exclude patterns to avoid sensitive files
- **File Size Limits**: Configure appropriate file size limits
- **External Drop**: Consider disabling external drag & drop in sensitive environments

## 📞 Contact Information

**Security Contact**: [cristian@ormasoft.cl](mailto:cristian@ormasoft.cl)  
**Project Maintainer**: Cristián Ormazábal  
**Organization**: Ormasoft Chile

## 📜 Legal

- **Responsible Disclosure**: We support responsible disclosure practices
- **No Legal Action**: We will not pursue legal action against researchers who follow responsible disclosure
- **Coordination**: We may coordinate with other security teams if the issue affects multiple projects

---

*Thank you for helping keep Focus Space and its users secure!* 🛡️

**Last Updated**: September 21, 2025  
**Version**: 1.0