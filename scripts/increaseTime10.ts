import { ethers } from "hardhat"
async function main(): Promise<void> {
  const signer = (await ethers.getSigners())[0]
  await ethers.provider.send("evm_increaseTime", [10])
  await ethers.provider.send("evm_mine", [])
  console.log("💵 time increased by 10 ")
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error)
    process.exit(1)
  })
