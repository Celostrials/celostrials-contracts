import { deployments, ethers } from "hardhat"
import { Celostrials__factory } from "../types"

async function main(): Promise<void> {
  const signer = (await ethers.getSigners())[0]
  let deployment = await deployments.getOrNull("Celostrials")
  if (!deployment) throw Error("No deployment")
  const celostrials = Celostrials__factory.connect(deployment.address, signer)

  await (await celostrials.closeWhitelist()).wait()
  console.log("💵 whitelist closed ")
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error)
    process.exit(1)
  })
