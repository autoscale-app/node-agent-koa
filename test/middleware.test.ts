import Koa from "koa"
import { createMockContext } from "@shopify/jest-koa-mocks"
import { autoscale } from "../src/middleware"
import { Agent } from "@autoscale/agent"
import { PLATFORM, OPTIONS, TOKEN, setup } from "./helpers"

beforeEach(setup)

test("use", () => {
  new Koa().use(autoscale(new Agent(PLATFORM, OPTIONS)))
})

test("default", async () => {
  const middleware = autoscale(new Agent(PLATFORM, OPTIONS))
  const ctx = createMockContext()
  const next = jest.fn()
  await middleware(ctx, next)
  expect(next).toHaveBeenCalled()
  expect(ctx.status).toBe(404)
  expect(ctx.body).toBe(undefined)
})

test("serve", async () => {
  const agent = new Agent(PLATFORM, OPTIONS).serve(TOKEN, async () => 1.23)
  const middleware = autoscale(agent)
  const ctx = createMockContext({
    method: "GET",
    url: "/autoscale",
    headers: {
      "autoscale-metric-tokens": `${TOKEN},invalid`
    }
  })
  const next = jest.fn()
  await middleware(ctx, next)
  expect(next).not.toHaveBeenCalled()
  expect(ctx.response.headers).toStrictEqual(
    {
      "content-length": "4",
      "content-type": "application/json",
      "cache-control": "must-revalidate, private, max-age=0",
    }
  )
  expect(ctx.status).toBe(200)
  expect(ctx.body).toBe("1.23")
})

test("serve 404", async () => {
  const agent = new Agent(PLATFORM, OPTIONS).serve(TOKEN, async () => 1.23)
  const middleware = autoscale(agent)
  const ctx = createMockContext({
    method: "GET",
    url: "/autoscale",
    headers: {
      "autoscale-metric-tokens": "invalid"
    }
  })
  const next = jest.fn()
  await middleware(ctx, next)
  expect(next).not.toHaveBeenCalled()
  expect(ctx.status).toBe(404)
  expect(ctx.body).toBe("can't find token-associated worker server")
})

test("call record queue time", async () => {
  const agent = new Agent(PLATFORM, OPTIONS).dispatch(TOKEN)
  const middleware = autoscale(agent)
  const ctx = createMockContext({
    method: "GET",
    url: "/",
    headers: {
      "x-request-start": String(Date.now())
    }
  })
  const next = jest.fn()
  await middleware(ctx, next)
  expect(next).toHaveBeenCalled()
  expect(ctx.status).toBe(404)
  expect(ctx.body).toBe(undefined)
  const dispatcher = agent.webDispatchers.queueTime
  if (dispatcher == null) { throw new Error("Expected dispatcher") }
  expect(dispatcher["buffer"].size).toBe(1)
})
