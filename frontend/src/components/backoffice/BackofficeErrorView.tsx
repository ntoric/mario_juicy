"use client";

import Link from "next/link";
import { Box, Typography, Button, Container } from "@mui/material";

interface BackofficeErrorViewProps {
  code: string;
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function BackofficeErrorView({
  code,
  title,
  message,
  actionText = "Back to Dashboard",
  actionHref = "/backoffice",
  onAction,
}: BackofficeErrorViewProps) {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "5rem", md: "8rem" },
            fontWeight: 800,
            lineHeight: 1,
            mb: 2,
            background: "linear-gradient(to bottom, #E9762B, #FFD41D)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.05em",
          }}
        >
          {code}
        </Typography>
        
        <Box sx={{ maxWidth: 450, mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
            {message}
          </Typography>
        </Box>

        {onAction ? (
          <Button
            variant="contained"
            size="large"
            onClick={onAction}
            sx={{
              bgcolor: "#E9762B",
              color: "white",
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: "1rem",
              fontWeight: 700,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#d35400",
                transform: "translateY(-2px)",
                transition: "all 0.2s ease-in-out",
              },
            }}
          >
            {actionText}
          </Button>
        ) : (
          <Button
            component={Link}
            href={actionHref}
            variant="contained"
            size="large"
            sx={{
              bgcolor: "#E9762B",
              color: "white",
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: "1rem",
              fontWeight: 700,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#d35400",
                transform: "translateY(-2px)",
                transition: "all 0.2s ease-in-out",
              },
            }}
          >
            {actionText}
          </Button>

        )}
      </Box>
    </Container>
  );
}
