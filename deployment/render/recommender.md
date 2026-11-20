# Restore recommendation guidance on Render

The free Blueprint runs the Node API without the Python recommender. In that setup the API falls back to a local port and continues generating drafts without recommendation guidance. Check the API's current values and the recommender service status in the Render dashboard before applying this configuration.

1. Create a Docker **Private Service** named `market-aura-ml` in the same Render workspace and region as `market-aura-api`. Use the shared repository, Dockerfile `CAPSTONE/Dockerfile`, build context `CAPSTONE`, and a paid plan with at least 2 GB of RAM (`1c-2g` or legacy Standard). Set `PORT=8080` and `RECOMMENDER_HOST=0.0.0.0` on the private service. The Dockerfile supplies the model and artifacts. Wait for the service to be running.
2. In the private service's **Connect → Internal** menu, copy its host and port. On the Node API running this change, set `RECOMMENDER_URL=http://<internal-host>:<port>/recommend`, `RECOMMENDER_AUTH_MODE=none`, and `RECOMMENDER_TIMEOUT_MS=30000`. Remove any previous `RECOMMENDER_AUDIENCE` and `RECOMMENDER_HEALTH_URL` overrides so health uses the same origin. For example, the recommendation URL might be `http://market-aura-ml-ab12:8080/recommend`.
3. Check `GET /health` and `POST /recommend` from a service on the same private network. After releasing the API with these settings, generate one test draft and verify the result actually shows recommendation guidance. The API's own `/ready` check can succeed during recommender fallback.

Restore the previous API configuration if verification fails. The checked-in free Blueprint remains opt-in for the recommender, so merging the code does not create a paid service on its own.

[Render private networking](https://render.com/docs/private-network) · [Render compute plans](https://render.com/docs/compute-plans)
