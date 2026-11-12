// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SocialAccountsPage from "../src/pages/app/SocialAccountsPage";
import HomePage from "../src/pages/public/HomePage";
import BillingPage from "../src/pages/app/BillingPage";

const socialHooks = vi.hoisted(() => ({
  useSocialStatus: vi.fn(() => ({
    data: {
      timezone: "UTC",
      platforms: {
        twitter: {
          isConnected: false,
          serverConfigured: true,
          username: null,
          name: null,
          expiresAt: null,
          connectedAt: null,
        },
        linkedin: {
          isConnected: false,
          serverConfigured: true,
          name: null,
          email: null,
          expiresAt: null,
          connectedAt: null,
        },
        instagram: {
          isConnected: false,
          serverConfigured: true,
          username: null,
          instagramId: null,
          accountType: null,
          expiresAt: null,
          connectedAt: null,
        },
        facebook: {
          isConnected: false,
          serverConfigured: true,
          pageId: null,
          pageName: null,
          pages: [],
          expiresAt: null,
          connectedAt: null,
        },
        email: {
          isConnected: false,
          serverConfigured: true,
          provider: null,
          fromName: null,
          fromEmail: null,
          defaultRecipients: [],
          webhookUrl: null,
          connectedAt: null,
        },
        blog: {
          isConnected: false,
          serverConfigured: true,
          provider: null,
          siteUrl: null,
          username: null,
          publicationId: null,
          connectedAt: null,
        },
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useUpdateTimezone: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useInitiateOAuthConnect: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
  })),
  useSelectFacebookPage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConnectEmailChannel: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConnectBlogChannel: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDisconnectSocialPlatform: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
  })),
  useSocialAccounts: vi.fn(() => ({ data: {}, isLoading: false, error: null })),
  useDisconnectInstagram: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
vi.mock("@/features/social-accounts", () => socialHooks);
const billingHooks = vi.hoisted(() => ({
  useCreateOrder: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useVerifyPayment: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));
vi.mock("@/features/billing", () => billingHooks);
vi.mock("@/features/auth", () => ({ useAuth: () => ({ user: { isPremium: false } }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

test("social accounts page renders connected platform controls for all 6 channels", () => {
  render(
    <MemoryRouter>
      <SocialAccountsPage />
    </MemoryRouter>,
  );
  expect(screen.getByText("Connected Platforms")).toBeTruthy();
  expect(screen.getByText("X (Twitter)")).toBeTruthy();
  expect(screen.getByText("LinkedIn")).toBeTruthy();
  expect(screen.getByText("Instagram Business")).toBeTruthy();
  expect(screen.getByText("Facebook Page")).toBeTruthy();
  expect(screen.getByText("Email Newsletter")).toBeTruthy();
  expect(screen.getByText("Blog / Website CMS")).toBeTruthy();
  expect(socialHooks.useSocialStatus).toHaveBeenCalled();
});

test("home highlights generating, scheduling, and multi-platform publishing", () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  expect(screen.getByText("Auto-schedule at peak times or publish everywhere")).toBeTruthy();
});

test("billing shows the MVP exclusion without payment hooks or upgrade controls", () => {
  render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Payments and subscriptions are unavailable in this MVP/i)).toBeTruthy();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe("/content/create");
  expect(screen.queryByText(/\$29|\$99|Unlimited credits/i)).toBeNull();
  expect(billingHooks.useCreateOrder).not.toHaveBeenCalled();
  expect(billingHooks.useVerifyPayment).not.toHaveBeenCalled();
});
