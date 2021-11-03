module.exports = {
 
  networks: {
     development: {
      host: "127.0.0.1",    
      port: 8545,            
      network_id: "*", 
      gasPrice: 150000000000, // 150 gwei
    },
  },

  mocha: {
  },

  compilers: {
    solc: {
      version: "stable",    
      docker: true,        
       settings: {       
        optimizer: {
          enabled: true,
          runs: 0
      },
      }
    }
  },

  db: {
    enabled: false
  }
};
